// FILE PATH: app/api/admin/dashboard/route.ts

import { connectDB } from "@/lib/db";
import { Order, Product, POSSale, FBRConfig, Refund } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !["admin", "staff", "manager", "accountant"].includes(payload.role))
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // ── Date range ──────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? "month";

    const now = new Date();
    let rangeStart: Date;
    if (range === "today") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "week") {
      rangeStart = new Date(now);
      rangeStart.setDate(now.getDate() - 7);
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // ── Fetch core data in parallel ─────────────────────────────────────────
    const [onlineOrders, posSales, products, fbrConfig] = await Promise.all([
      Order.find({ createdAt: { $gte: rangeStart } })
        .select(
          "total gstAmount orderStatus paymentStatus paymentMethod " +
          "orderNumber createdAt shippingAddress items user",
        )
        .populate({ path: "items.product", select: "name" })
        .lean(),
      POSSale.find({ createdAt: { $gte: rangeStart } })
        .select("totalAmount total gstAmount tax createdAt")
        .lean(),
      Product.find().select("name stock lowStockThreshold retailPrice sellingPrice").lean(),
      FBRConfig.findOne().lean(),
    ]);

    // ── Revenue ─────────────────────────────────────────────────────────────
    const onlineRevenue = onlineOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const posRevenue    = posSales.reduce((s, p) => s + ((p as any).totalAmount ?? (p as any).total ?? 0), 0);
    const totalSales    = onlineRevenue + posRevenue;
    const gstCollected  = onlineOrders.reduce((s, o) => s + ((o as any).gstAmount ?? 0), 0)
                        + posSales.reduce((s, p) => s + ((p as any).gstAmount ?? (p as any).tax ?? 0), 0);

    // ── Order counts ────────────────────────────────────────────────────────
    const totalOrders     = onlineOrders.length + posSales.length;
    const posOrders       = posSales.length;
    const onlineOrdersCount = onlineOrders.length;

    const approvedOrders  = onlineOrders.filter(o => o.paymentStatus === "verified" && o.orderStatus === "processing").length;
    const deliveredOrders = onlineOrders.filter(o => o.orderStatus === "delivered").length;
    const cancelledOrders = onlineOrders.filter(o => o.orderStatus === "cancelled").length;
    const pendingOrders   = onlineOrders.filter(o =>
      o.orderStatus === "pending" ||
      (o.paymentStatus === "pending" && o.orderStatus !== "cancelled"),
    ).length;
    const pendingPayments = onlineOrders.filter(o => o.paymentStatus === "pending").length;

    // ── Pending orders list (for detail panel) ──────────────────────────────
    const pendingOrdersList = onlineOrders
      .filter(o =>
        o.orderStatus === "pending" ||
        (o.paymentStatus === "pending" && o.orderStatus !== "cancelled"),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map(o => ({
        _id:           (o as any)._id?.toString(),
        orderNumber:   (o as any).orderNumber,
        createdAt:     o.createdAt,
        total:         o.total ?? 0,
        paymentMethod: (o as any).paymentMethod ?? "",
        shippingAddress: (o as any).shippingAddress
          ? {
              fullName: (o as any).shippingAddress.fullName,
              city:     (o as any).shippingAddress.city,
            }
          : undefined,
        items: ((o as any).items ?? []).map((it: any) => ({
          name:     it.product?.name ?? it.name ?? "Item",
          quantity: it.quantity ?? 1,
        })),
      }));

    // ── Low stock ───────────────────────────────────────────────────────────
    const lowStockProducts = products
      .filter(p => (p.stock ?? 0) <= (p.lowStockThreshold ?? 10))
      .map(p => ({ name: p.name, stock: p.stock ?? 0, threshold: p.lowStockThreshold ?? 10 }))
      .sort((a, b) => a.stock - b.stock);

    // ── Inventory value ─────────────────────────────────────────────────────
    // costValue  = stock × retailPrice (buying cost stored as retailPrice on Product)
    // retailValue = stock × sellingPrice
    // We use retailPrice as the cost proxy; if your schema uses a different field, adjust here.
    let inventoryCurrentValue = 0;
    let inventoryRetailValue  = 0;
    let totalSkus             = 0;
    let totalStockUnits       = 0;

    for (const p of products) {
      const qty = p.stock ?? 0;
      if (qty > 0) {
        totalSkus++;
        totalStockUnits       += qty;
        inventoryCurrentValue += qty * ((p as any).retailPrice ?? 0);
        inventoryRetailValue  += qty * ((p as any).sellingPrice ?? (p as any).retailPrice ?? 0);
      }
    }

    // ── Returns / Refunds ───────────────────────────────────────────────────
    let totalReturns        = 0;
    let returnAmount        = 0;
    let pendingReturnAmount = 0;

    try {
      const refunds = await Refund.find({ createdAt: { $gte: rangeStart } })
        .select("refundAmount status")
        .lean();

      totalReturns        = refunds.length;
      returnAmount        = refunds.reduce((s, r) => s + ((r as any).refundAmount ?? 0), 0);
      pendingReturnAmount = refunds
        .filter(r => (r as any).status === "pending")
        .reduce((s, r) => s + ((r as any).refundAmount ?? 0), 0);
    } catch {
      // Refund model may not exist yet — degrade gracefully
    }

    // ── Monthly data (last 6 months, all-time) ──────────────────────────────
    const [allOrders, allPosSales] = await Promise.all([
      Order.find().select("createdAt total").lean(),
      POSSale.find().select("createdAt totalAmount total").lean(),
    ]);

    const monthlyMap: Record<string, { month: string; sales: number; orders: number; index: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap[key] = { month: d.toLocaleString("default", { month: "short" }), sales: 0, orders: 0, index: 5 - i };
    }

    allOrders.forEach(o => {
      const d   = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap[key]) { monthlyMap[key].sales += o.total ?? 0; monthlyMap[key].orders++; }
    });
    allPosSales.forEach(s => {
      const d   = new Date((s as any).createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap[key]) { monthlyMap[key].sales += (s as any).totalAmount ?? (s as any).total ?? 0; monthlyMap[key].orders++; }
    });

    const monthlyData = Object.values(monthlyMap)
      .sort((a, b) => a.index - b.index)
      .map(({ month, sales, orders }) => ({ month, sales, orders }));

    // ── Daily data (last 7 days) ────────────────────────────────────────────
    const dailyMap: Record<string, { date: string; sales: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = {
        date:   d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric" }),
        sales:  0,
        orders: 0,
      };
    }
    [...allOrders, ...allPosSales].forEach(entry => {
      const key = new Date((entry as any).createdAt).toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].sales  += (entry as any).total ?? (entry as any).totalAmount ?? 0;
        dailyMap[key].orders++;
      }
    });
    const dailyData = Object.values(dailyMap);

    // ── Misc ────────────────────────────────────────────────────────────────
    const fbrStatus      = (fbrConfig as any)?.isActive ? "active" : "inactive";
    const totalCustomers = new Set(allOrders.map(o => (o as any).user?.toString()).filter(Boolean)).size;

    // ── Response ────────────────────────────────────────────────────────────
    return NextResponse.json({
      stats: {
        // Revenue
        totalSales,
        gstCollected,
        posRevenue,
        onlineRevenue,

        // Orders
        totalOrders,
        posOrders,
        onlineOrders:    onlineOrdersCount,
        approvedOrders,
        deliveredOrders,
        pendingOrders,
        cancelledOrders,
        pendingPayments,
        pendingOrdersList,

        // Inventory
        inventoryCurrentValue,
        inventoryRetailValue,
        totalSkus,
        totalStockUnits,

        // Returns
        totalReturns,
        returnAmount,
        pendingReturnAmount,

        // Misc
        lowStockProducts,
        monthlyData,
        dailyData,
        fbrStatus,
        totalCustomers,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}