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

    // Optimized Aggregation
    const [financialStats, expenseStats, inventoryValue] = await Promise.all([
      // 1. Calculate Revenue & COGS from both Online and POS
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
    ]);

    const online = financialStats[0][0] || { rev: 0, profit: 0 };
    const pos = financialStats[1][0] || { rev: 0, cogs: 0 };

    const totalRevenue = online.rev + pos.rev;
    const totalCOGS = online.rev - online.profit + pos.cogs;
    const totalExpenses = expenseStats.reduce(
      (acc, curr) => acc + curr.total,
      0,
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
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
