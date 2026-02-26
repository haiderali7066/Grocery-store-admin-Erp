import { connectDB } from "@/lib/db";
import { Order, POSSale, Expense, InventoryBatch } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import moment from "moment";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "monthly";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const includeDetail = searchParams.get("detail") === "true";

    let start = moment().startOf("month").toDate();
    let end = moment().endOf("day").toDate();

    if (period === "daily") start = moment().startOf("day").toDate();
    else if (period === "weekly")
      start = moment().subtract(7, "days").startOf("day").toDate();
    else if (period === "custom" && dateFrom && dateTo) {
      start = moment(dateFrom).startOf("day").toDate();
      end = moment(dateTo).endOf("day").toDate();
    }

    const matchQuery = { createdAt: { $gte: start, $lte: end } };

    const [financialStats, expenseStats, inventoryValue, onlineOrders, posSales] =
      await Promise.all([
        // 1. Revenue & COGS aggregations
        Promise.all([
          Order.aggregate([
            { $match: { ...matchQuery, orderStatus: { $ne: "cancelled" } } },
            {
              $group: {
                _id: null,
                rev: { $sum: "$subtotal" },
                profit: { $sum: "$profit" },
              },
            },
          ]),
          POSSale.aggregate([
            { $match: { ...matchQuery, paymentStatus: "completed" } },
            {
              $group: {
                _id: null,
                rev: { $sum: "$subtotal" },
                cogs: { $sum: "$costOfGoods" },
              },
            },
          ]),
        ]),

        // 2. Expense Breakdown
        Expense.aggregate([
          { $match: { date: { $gte: start, $lte: end } } },
          { $group: { _id: "$category", total: { $sum: "$amount" } } },
        ]),

        // 3. Current Inventory Value
        InventoryBatch.aggregate([
          { $match: { status: { $ne: "finished" } } },
          {
            $group: {
              _id: null,
              total: {
                $sum: { $multiply: ["$remainingQuantity", "$buyingRate"] },
              },
            },
          },
        ]),

        // 4. Online orders detail (if requested)
        includeDetail
          ? Order.find(
              { ...matchQuery, orderStatus: { $ne: "cancelled" } },
              {
                orderNumber: 1,
                subtotal: 1,
                profit: 1,
                createdAt: 1,
                orderStatus: 1,
                "shippingAddress.name": 1,
                // ✅ Include items for online orders too
                items: 1,
              }
            )
              .populate("items.product", "name sku")
              .sort({ createdAt: -1 })
              .lean()
              .then((orders) =>
                orders.map((o: any) => ({
                  _id: o._id.toString(),
                  orderNumber: o.orderNumber,
                  subtotal: o.subtotal,
                  profit: o.profit,
                  createdAt: o.createdAt,
                  orderStatus: o.orderStatus,
                  customerName: o.shippingAddress?.name || null,
                  items: (o.items || []).map((item: any) => ({
                    name: item.product?.name || item.name || "Unknown Item",
                    sku: item.product?.sku || null,
                    quantity: item.quantity || 0,
                    price: item.price || 0,
                    subtotal: item.subtotal ?? (item.price || 0) * (item.quantity || 0),
                  })),
                }))
              )
          : Promise.resolve([]),

        // 5. POS sales detail (if requested)
        // ✅ Populate cashier name and items.product for item names
        includeDetail
          ? POSSale.find(
              { ...matchQuery, paymentStatus: "completed" },
              {
                subtotal: 1,
                costOfGoods: 1,
                createdAt: 1,
                paymentMethod: 1,
                items: 1,
                saleNumber: 1,
                cashier: 1,
              }
            )
              .populate("cashier", "name")
              .populate("items.product", "name sku")
              .sort({ createdAt: -1 })
              .lean()
              .then((sales) =>
                sales.map((s: any) => ({
                  _id: s._id.toString(),
                  saleNumber: s.saleNumber || null,
                  cashierName: s.cashier?.name || null,
                  subtotal: s.subtotal,
                  costOfGoods: s.costOfGoods,
                  createdAt: s.createdAt,
                  paymentMethod: s.paymentMethod,
                  // ✅ Map items with populated product name
                  items: (s.items || []).map((item: any) => ({
                    name: item.product?.name || item.name || "Unknown Item",
                    sku: item.product?.sku || null,
                    quantity: item.quantity || 0,
                    price: item.price || 0,
                    subtotal: item.subtotal ?? (item.price || 0) * (item.quantity || 0),
                  })),
                }))
              )
          : Promise.resolve([]),
      ]);

    const online = financialStats[0][0] || { rev: 0, profit: 0 };
    const pos = financialStats[1][0] || { rev: 0, cogs: 0 };

    const totalRevenue = online.rev + pos.rev;
    const totalCOGS = online.rev - online.profit + pos.cogs;
    const totalExpenses = expenseStats.reduce(
      (acc, curr) => acc + curr.total,
      0
    );
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        grossProfit,
        netProfit,
        totalExpenses,
        inventoryValue: inventoryValue[0]?.total || 0,
        margins: {
          gross: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          net: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        },
      },
      breakdown: {
        online: online.rev,
        pos: pos.rev,
        expenses: expenseStats.map((e) => ({
          category: e._id,
          amount: e.total,
        })),
      },
      ...(includeDetail && {
        detail: {
          onlineOrders,
          posSales,
        },
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}