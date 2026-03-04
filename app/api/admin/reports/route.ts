// FILE PATH: app/api/admin/reports/route.ts

import { connectDB } from "@/lib/db";
import { Order, POSSale, Expense, InventoryBatch, Product } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import moment from "moment";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token   = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period        = searchParams.get("period") || "monthly";
    const dateFrom      = searchParams.get("dateFrom");
    const dateTo        = searchParams.get("dateTo");
    const includeDetail = searchParams.get("detail") === "true";

    let start = moment().startOf("month").toDate();
    let end   = moment().endOf("day").toDate();

    if (period === "daily")  start = moment().startOf("day").toDate();
    else if (period === "weekly") start = moment().subtract(7, "days").startOf("day").toDate();
    else if (period === "custom" && dateFrom && dateTo) {
      start = moment(dateFrom).startOf("day").toDate();
      end   = moment(dateTo).endOf("day").toDate();
    }

    const matchQuery = { createdAt: { $gte: start, $lte: end } };

    // ── 1. Fetch raw online orders (with items + product cost data) ───────────
    // We NEVER trust the stored `profit` field on Order — it's often null/0.
    // Instead we recalculate COGS per item using (in priority order):
    //   a) item.costPrice  — stored at checkout if CartProvider passes it
    //   b) product.lastBuyingRate — last known landed cost on the product doc
    //   c) 0 (fallback)
    const rawOnlineOrders = await Order.find(
      { ...matchQuery, orderStatus: { $ne: "cancelled" } },
      {
        orderNumber:      1,
        subtotal:         1,
        createdAt:        1,
        orderStatus:      1,
        shippingAddress:  1,
        items:            1,
      }
    )
      .populate("items.product", "name sku lastBuyingRate")
      .sort({ createdAt: -1 })
      .lean() as any[];

    // Calculate per-order profit
    const onlineOrdersWithProfit = rawOnlineOrders.map((o: any) => {
      const itemsCOGS = (o.items || []).reduce((sum: number, item: any) => {
        // Prefer costPrice stored on the order item, then product.lastBuyingRate
        const costPerUnit =
          item.costPrice ??
          item.product?.lastBuyingRate ??
          0;
        return sum + costPerUnit * (item.quantity || 0);
      }, 0);

      const profit = o.subtotal - itemsCOGS;

      return {
        _id:          o._id.toString(),
        orderNumber:  o.orderNumber,
        subtotal:     o.subtotal,
        costOfGoods:  itemsCOGS,
        profit,
        createdAt:    o.createdAt,
        orderStatus:  o.orderStatus,
        customerName: o.shippingAddress?.name || o.shippingAddress?.fullName || null,
        items: (o.items || []).map((item: any) => ({
          name:     item.product?.name || item.name || "Unknown Item",
          sku:      item.product?.sku  || null,
          quantity: item.quantity  || 0,
          price:    item.price     || 0,
          subtotal: item.subtotal  ?? (item.price || 0) * (item.quantity || 0),
        })),
      };
    });

    // Aggregate online totals from the correctly calculated per-order values
    const onlineRevenue = onlineOrdersWithProfit.reduce((s, o) => s + o.subtotal,    0);
    const onlineCOGS    = onlineOrdersWithProfit.reduce((s, o) => s + o.costOfGoods, 0);
    const onlineProfit  = onlineOrdersWithProfit.reduce((s, o) => s + o.profit,      0);

    // ── 2. POS sales aggregate ────────────────────────────────────────────────
    const [posAgg] = await POSSale.aggregate([
      { $match: { ...matchQuery, paymentStatus: "completed" } },
      {
        $group: {
          _id:  null,
          rev:  { $sum: "$subtotal" },
          cogs: { $sum: "$costOfGoods" },
        },
      },
    ]);
    const posRevenue = posAgg?.rev  ?? 0;
    const posCOGS    = posAgg?.cogs ?? 0;

    // ── 3. Expense breakdown ──────────────────────────────────────────────────
    const expenseStats = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]);

    // ── 4. Inventory value ────────────────────────────────────────────────────
    const inventoryAgg = await InventoryBatch.aggregate([
      { $match: { status: { $ne: "finished" } } },
      {
        $group: {
          _id:   null,
          total: { $sum: { $multiply: ["$remainingQuantity", "$buyingRate"] } },
        },
      },
    ]);

    // ── 5. POS sales detail ───────────────────────────────────────────────────
    const posSalesDetail = includeDetail
      ? await POSSale.find(
          { ...matchQuery, paymentStatus: "completed" },
          { subtotal: 1, costOfGoods: 1, createdAt: 1, paymentMethod: 1, items: 1, saleNumber: 1, cashier: 1 }
        )
          .populate("cashier", "name")
          .populate("items.product", "name sku")
          .sort({ createdAt: -1 })
          .lean()
          .then((sales: any[]) =>
            sales.map((s) => ({
              _id:          s._id.toString(),
              saleNumber:   s.saleNumber   || null,
              cashierName:  s.cashier?.name || null,
              subtotal:     s.subtotal,
              costOfGoods:  s.costOfGoods,
              createdAt:    s.createdAt,
              paymentMethod: s.paymentMethod,
              items: (s.items || []).map((item: any) => ({
                name:     item.product?.name || item.name || "Unknown Item",
                sku:      item.product?.sku  || null,
                quantity: item.quantity  || 0,
                price:    item.price     || 0,
                subtotal: item.subtotal  ?? (item.price || 0) * (item.quantity || 0),
              })),
            }))
          )
      : [];

    // ── 6. Compute summary stats ──────────────────────────────────────────────
    const totalRevenue   = onlineRevenue + posRevenue;
    const totalCOGS      = onlineCOGS    + posCOGS;
    const grossProfit    = totalRevenue  - totalCOGS;
    const totalExpenses  = expenseStats.reduce((acc, e) => acc + e.total, 0);
    const netProfit      = grossProfit   - totalExpenses;

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        grossProfit,
        netProfit,
        totalExpenses,
        inventoryValue: inventoryAgg[0]?.total || 0,
        margins: {
          gross: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          net:   totalRevenue > 0 ? (netProfit   / totalRevenue) * 100 : 0,
        },
      },
      breakdown: {
        online:   onlineRevenue,
        pos:      posRevenue,
        expenses: expenseStats.map((e) => ({ category: e._id, amount: e.total })),
      },
      ...(includeDetail && {
        detail: {
          onlineOrders: onlineOrdersWithProfit,
          posSales:     posSalesDetail,
        },
      }),
    });
  } catch (error: any) {
    console.error("[Reports API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}