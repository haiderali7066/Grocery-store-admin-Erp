import { connectDB } from "@/lib/db";
import { Order, Product, POSSale, FBRConfig } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (
      !payload ||
      !["admin", "staff", "manager", "accountant"].includes(payload.role)
    )
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // ── Date range ──────────────────────────────────────────
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
      // month (default)
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // ── Fetch all data in parallel ───────────────────────────
    const [onlineOrders, posSales, products, fbrConfig] = await Promise.all([
      Order.find({ createdAt: { $gte: rangeStart } }).lean(),
      POSSale.find({ createdAt: { $gte: rangeStart } }).lean(),
      Product.find().lean(),
      FBRConfig.findOne().lean(),
    ]);

    // ── Online order stats ───────────────────────────────────
    // Schema: total = final amount, gstAmount = tax, profit = profit field
    const onlineRevenue = onlineOrders.reduce(
      (sum, o) => sum + (o.total ?? 0),
      0,
    );
    const onlineProfit = onlineOrders.reduce(
      (sum, o) => sum + (o.profit ?? 0),
      0,
    );
    const onlineGst = onlineOrders.reduce(
      (sum, o) => sum + (o.gstAmount ?? 0),
      0,
    );

    // ── POS sale stats ───────────────────────────────────────
    // Schema: totalAmount (or total alias), profit, tax (gst amount)
    const posRevenue = posSales.reduce(
      (sum, s) => sum + (s.totalAmount ?? s.total ?? 0),
      0,
    );
    const posProfit = posSales.reduce((sum, s) => sum + (s.profit ?? 0), 0);
    const posGst = posSales.reduce(
      (sum, s) => sum + (s.gstAmount ?? s.tax ?? 0),
      0,
    );

    // ── Combined totals ──────────────────────────────────────
    const totalSales = onlineRevenue + posRevenue;
    const totalProfit = onlineProfit + posProfit;
    const gstCollected = onlineGst + posGst;
    // GST liability = what you owe to FBR = gstCollected (it IS the liability)
    // gstLiability here means net payable after input tax adjustments — simplified as collected
    const gstLiability = gstCollected;

    // ── Order counts ─────────────────────────────────────────
    // Online orders: orderStatus field
    const totalOrders = onlineOrders.length + posSales.length;
    const pendingOrders = onlineOrders.filter(
      (o) => o.orderStatus === "pending" || o.orderStatus === "confirmed",
    ).length;
    const completedOrders =
      onlineOrders.filter((o) => o.orderStatus === "delivered").length +
      posSales.length; // All POS sales = completed
    const cancelledOrders = onlineOrders.filter(
      (o) => o.orderStatus === "cancelled",
    ).length;

    // ── Pending payments (unverified bank/easypaisa/jazzcash) ─
    const pendingPayments = onlineOrders.filter(
      (o) => o.paymentStatus === "pending",
    ).length;

    // ── Low stock ─────────────────────────────────────────────
    const lowStockProducts = products
      .filter((p) => p.stock <= (p.lowStockThreshold ?? 10))
      .map((p) => ({
        name: p.name,
        stock: p.stock ?? 0,
        threshold: p.lowStockThreshold ?? 10,
      }))
      .sort((a, b) => a.stock - b.stock); // Most critical first

    // ── Monthly data (last 6 months) ─────────────────────────
    // Fetch all-time for monthly chart regardless of range filter
    const [allOrders, allPosSales] = await Promise.all([
      Order.find().lean(),
      POSSale.find().lean(),
    ]);

    // FIX: Added '<' after Record
    const monthlyMap: Record<
      string,
      { month: string; sales: number; profit: number; index: number }
    > = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap[key] = {
        month: d.toLocaleString("default", { month: "short" }),
        sales: 0,
        profit: 0,
        index: 5 - i,
      };
    }

    const addToMonth = (date: Date, sales: number, profit: number) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].sales += sales;
        monthlyMap[key].profit += profit;
      }
    };

    allOrders.forEach((o) => {
      addToMonth(new Date(o.createdAt), o.total ?? 0, o.profit ?? 0);
    });
    allPosSales.forEach((s) => {
      addToMonth(
        new Date(s.createdAt),
        s.totalAmount ?? s.total ?? 0,
        s.profit ?? 0,
      );
    });

    const monthlyData = Object.values(monthlyMap)
      .sort((a, b) => a.index - b.index)
      .map(({ month, sales, profit }) => ({ month, sales, profit }));

    // ── Daily data (last 7 days, for "today/week" range) ─────
    // FIX: Added '<' after Record
    const dailyMap: Record<
      string,
      { date: string; sales: number; profit: number }
    > = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = {
        date: d.toLocaleDateString("en-PK", {
          weekday: "short",
          day: "numeric",
        }),
        sales: 0,
        profit: 0,
      };
    }

    // Note: iterating over 'allOrders' again for daily map.
    // If you only want daily data for the selected range, use onlineOrders/posSales instead.
    // Assuming you want "last 7 days" relative to TODAY regardless of filter:
    [...allOrders, ...allPosSales].forEach((entry) => {
      const d = new Date(entry.createdAt);
      const key = d.toISOString().slice(0, 10);

      // Only add if this date exists in our last-7-days map
      if (dailyMap[key]) {
        dailyMap[key].sales +=
          (entry as any).total ?? (entry as any).totalAmount ?? 0;
        dailyMap[key].profit += (entry as any).profit ?? 0;
      }
    });

    const dailyData = Object.values(dailyMap);

    // ── FBR status ───────────────────────────────────────────
    const fbrStatus = fbrConfig?.isActive ? "active" : "inactive";

    // ── Total customers (unique users from online orders) ────
    const uniqueCustomers = new Set(
      allOrders.map((o) => o.user?.toString()).filter(Boolean),
    );
    const totalCustomers = uniqueCustomers.size;

    return NextResponse.json(
      {
        stats: {
          totalSales,
          totalOrders,
          totalProfit,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          lowStockProducts,
          monthlyData,
          dailyData,
          gstCollected,
          gstLiability,
          posRevenue,
          onlineRevenue,
          pendingPayments,
          fbrStatus,
          totalCustomers,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
