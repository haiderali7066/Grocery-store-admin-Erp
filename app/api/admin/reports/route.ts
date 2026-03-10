// FILE PATH: app/api/admin/reports/route.ts

import { connectDB } from "@/lib/db";
import { Order, POSSale, Transaction, InventoryBatch, Wallet, Refund } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import moment from "moment";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token   = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || !["admin", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const period        = searchParams.get("period") || "monthly";
    const dateFrom      = searchParams.get("dateFrom");
    const dateTo        = searchParams.get("dateTo");
    const includeDetail = searchParams.get("detail") === "true";

    let start = moment().startOf("month").toDate();
    let end   = moment().endOf("day").toDate();

    if (period === "daily")
      start = moment().startOf("day").toDate();
    else if (period === "weekly")
      start = moment().subtract(7, "days").startOf("day").toDate();
    else if (period === "custom" && dateFrom && dateTo) {
      start = moment(dateFrom).startOf("day").toDate();
      end   = moment(dateTo).endOf("day").toDate();
    }

    const dateMatch    = { createdAt: { $gte: start, $lte: end } };

    // ── 1. Online Orders ──────────────────────────────────────────────────────
    // Recalculate COGS per order — never trust stored `profit` field
    const rawOnlineOrders = await Order.find(
      { ...dateMatch, orderStatus: { $ne: "cancelled" } },
      { orderNumber: 1, subtotal: 1, shippingCost: 1, paymentMethod: 1,
        createdAt: 1, orderStatus: 1, shippingAddress: 1, items: 1 }
    )
      .populate("items.product", "name sku lastBuyingRate")
      .sort({ createdAt: -1 })
      .lean() as any[];

    const onlineOrdersWithProfit = rawOnlineOrders.map((o: any) => {
      const itemsCOGS = (o.items || []).reduce((sum: number, item: any) => {
        const cost = item.costPrice ?? item.product?.lastBuyingRate ?? 0;
        return sum + cost * (item.quantity || 0);
      }, 0);
      return {
        _id:           o._id.toString(),
        orderNumber:   o.orderNumber,
        subtotal:      o.subtotal    || 0,
        shippingCost:  o.shippingCost || 0,
        costOfGoods:   itemsCOGS,
        profit:        (o.subtotal || 0) - itemsCOGS,
        createdAt:     o.createdAt,
        orderStatus:   o.orderStatus,
        paymentMethod: o.paymentMethod,
        customerName:  o.shippingAddress?.fullName || o.shippingAddress?.name || null,
        items: (o.items || []).map((item: any) => ({
          name:     item.product?.name || item.name || "Unknown Item",
          sku:      item.product?.sku  || null,
          quantity: item.quantity  || 0,
          price:    item.price     || 0,
          subtotal: item.subtotal  ?? (item.price || 0) * (item.quantity || 0),
        })),
      };
    });

    const onlineRevenue = onlineOrdersWithProfit.reduce((s, o) => s + o.subtotal,    0);
    const onlineCOGS    = onlineOrdersWithProfit.reduce((s, o) => s + o.costOfGoods, 0);

    // ── 2. POS Sales ──────────────────────────────────────────────────────────
    const [posAgg] = await POSSale.aggregate([
      { $match: { ...dateMatch, paymentStatus: "completed" } },
      { $group: { _id: null, rev: { $sum: "$subtotal" }, cogs: { $sum: "$costOfGoods" } } },
    ]);
    const posRevenue = posAgg?.rev  ?? 0;
    const posCOGS    = posAgg?.cogs ?? 0;

    const posSalesDetail = includeDetail
      ? await POSSale.find(
          { ...dateMatch, paymentStatus: "completed" },
          { subtotal: 1, costOfGoods: 1, createdAt: 1, paymentMethod: 1, items: 1, saleNumber: 1, cashier: 1 }
        )
          .populate("cashier",       "name")
          .populate("items.product", "name sku")
          .sort({ createdAt: -1 })
          .lean()
          .then((sales: any[]) =>
            sales.map((s) => ({
              _id:           s._id.toString(),
              saleNumber:    s.saleNumber    || null,
              cashierName:   s.cashier?.name || null,
              subtotal:      s.subtotal,
              costOfGoods:   s.costOfGoods,
              createdAt:     s.createdAt,
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

    // ── 3. Operating Expenses ─────────────────────────────────────────────────
    // Expenses live in Transaction (type:"expense"). Exclude internal
    // "Refund" and "Delivery Loss" entries to avoid double-counting.
    const expenseStats = await Transaction.aggregate([
      {
        $match: {
          ...dateMatch,
          type:     "expense",
          category: { $nin: ["Refund", "Delivery Loss"] },
        },
      },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]);
    const totalOperatingExpenses = expenseStats.reduce((a, e) => a + e.total, 0);

    // ── 4. Delivery losses from refunds (the ONLY refund cost that hits P&L) ──
    // Refunds themselves are NOT a P&L expense — inventory is restocked so the
    // goods are returned. Only the delivery cost that cannot be recovered is a
    // real business loss.
    const [refundAgg] = await Refund.aggregate([
      { $match: { ...dateMatch, status: { $in: ["completed", "approved"] } } },
      {
        $group: {
          _id:           null,
          deliveryLoss:  { $sum: "$deliveryCost"   },
          totalRefunded: { $sum: "$refundedAmount"  },
          onlineCount:   { $sum: { $cond: [{ $eq: ["$returnType", "online"] }, 1, 0] } },
          posCount:      { $sum: { $cond: [{ $ne:  ["$returnType", "online"] }, 1, 0] } },
        },
      },
    ]);

    const deliveryLoss   = refundAgg?.deliveryLoss  ?? 0;  // ← hits P&L
    const totalRefunded  = refundAgg?.totalRefunded  ?? 0;  // ← informational only
    const onlineReturns  = refundAgg?.onlineCount    ?? 0;
    const posReturns     = refundAgg?.posCount        ?? 0;

    // ── 5. Inventory Value ────────────────────────────────────────────────────
    const [inventoryAgg] = await InventoryBatch.aggregate([
      { $match: { status: { $ne: "finished" } } },
      { $group: { _id: null, total: { $sum: { $multiply: ["$remainingQuantity", "$buyingRate"] } } } },
    ]);

    // ── 6. Wallet snapshot ────────────────────────────────────────────────────
    let walletDoc = await Wallet.findOne().lean() as any;
    if (!walletDoc) walletDoc = { cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0 };
    const wallet = {
      cash:         walletDoc.cash      || 0,
      bank:         walletDoc.bank      || 0,
      easyPaisa:    walletDoc.easyPaisa || 0,
      jazzCash:     walletDoc.jazzCash  || 0,
      totalBalance: (walletDoc.cash || 0) + (walletDoc.bank || 0) +
                    (walletDoc.easyPaisa || 0) + (walletDoc.jazzCash || 0),
    };

    // ── 7. P&L Calculation ────────────────────────────────────────────────────
    //
    //   Gross Profit  = Revenue − COGS
    //   Net Profit    = Gross Profit − Operating Expenses − Delivery Losses
    //
    // Refund amounts are NOT deducted: stock is returned so there's no net loss
    // on the goods themselves. Only the unrecoverable delivery cost is expensed.
    //
    const totalRevenue  = onlineRevenue + posRevenue;
    const totalCOGS     = onlineCOGS    + posCOGS;
    const grossProfit   = totalRevenue  - totalCOGS;
    const netProfit     = grossProfit   - totalOperatingExpenses - deliveryLoss;

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        grossProfit,
        netProfit,
        totalCOGS,
        totalExpenses:  totalOperatingExpenses,   // operating expenses only
        deliveryLoss,                             // delivery cost on returns
        inventoryValue: inventoryAgg?.total || 0,
        margins: {
          gross: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          net:   totalRevenue > 0 ? (netProfit   / totalRevenue) * 100 : 0,
        },
      },
      breakdown: {
        // Revenue
        online:       onlineRevenue,
        pos:          posRevenue,
        onlineCOGS,
        posCOGS,
        // Expenses that reduce profit
        expenses:     expenseStats.map((e) => ({ category: e._id, amount: e.total })),
        deliveryLoss,
        // Refund info (informational — does NOT reduce profit)
        refunds: {
          totalRefunded,
          onlineCount: onlineReturns,
          posCount:    posReturns,
          totalCount:  onlineReturns + posReturns,
          note:        "Refunds restock inventory — only delivery loss above affects P&L",
        },
      },
      wallet,
      ...(includeDetail && {
        detail: {
          onlineOrders: onlineOrdersWithProfit,
          posSales:     posSalesDetail,
        },
      }),
    });
  } catch (error: any) {
    console.error("[Reports API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}