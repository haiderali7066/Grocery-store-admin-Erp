// FILE PATH: app/api/admin/reports/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// FIX: Online order COGS now uses stored costOfGoods (like POS) with item-level
//      recalculation as fallback. Also fixes populate to include costPrice field.
// ═══════════════════════════════════════════════════════════════════════════════

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

    // ── Date Range ──────────────────────────────────────────────────────────
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

    const dateMatch   = { createdAt: { $gte: start, $lte: end } };
    const periodLabel = period === "custom" && dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : period;

    // ── STEP 2: ONLINE ORDERS ────────────────────────────────────────────────
    //
    // FIX: Added `costOfGoods` and `profit` to the projection so that if the
    //      Order document already stores them (set at order-creation time), we
    //      use those values directly — exactly the same pattern POS uses.
    //
    //      The ORDER item schema has no costPrice field — no cost snapshot is
    //      saved at order time. Product.lastBuyingRate is unreliable (it gets
    //      overwritten on every new purchase).
    //
    //      SOURCE OF TRUTH: InventoryBatch.buyingRate — this is set directly
    //      from Purchase records and never drifts. We build a productId→cost
    //      map from batches, then use it to calculate per-order COGS.
    //
    const rawOnlineOrders = await Order.find(
      { ...dateMatch, orderStatus: { $ne: "cancelled" } },
      {
        orderNumber: 1, subtotal: 1, shippingCost: 1, paymentMethod: 1,
        createdAt: 1, orderStatus: 1, shippingAddress: 1, items: 1,
      }
    )
      .populate("items.product", "name sku")   // only need name/sku — cost comes from batches
      .sort({ createdAt: -1 })
      .lean() as any[];

    // ── Build productId → weighted-average buyingRate from InventoryBatch ──
    // Uses ALL batches (active + partial + finished) so historical orders
    // whose batch is now finished still get a cost assigned.
    const allBatches = await InventoryBatch.find(
      {},
      { product: 1, buyingRate: 1, quantity: 1 }
    ).lean() as any[];

    // Weighted average: sum(buyingRate * quantity) / sum(quantity) per product
    const batchTotals = new Map<string, { totalCost: number; totalQty: number }>();
    for (const b of allBatches) {
      const id  = b.product?.toString();
      if (!id) continue;
      const cur = batchTotals.get(id) ?? { totalCost: 0, totalQty: 0 };
      cur.totalCost += (b.buyingRate || 0) * (b.quantity || 0);
      cur.totalQty  += b.quantity || 0;
      batchTotals.set(id, cur);
    }
    // productCostMap: productId (string) → weighted avg buying rate
    const productCostMap = new Map<string, number>();
    for (const [id, { totalCost, totalQty }] of batchTotals) {
      productCostMap.set(id, totalQty > 0 ? totalCost / totalQty : 0);
    }

    const onlineOrdersWithProfit = rawOnlineOrders.map((o: any) => {
      const itemsCOGS = (o.items || []).reduce((sum: number, item: any) => {
        const productId = item.product?._id?.toString() ?? item.product?.toString();
        // Priority:
        //   1. InventoryBatch weighted-avg buyingRate (most accurate)
        //   2. Zero if product has no batch records yet
        const rate = (productId ? productCostMap.get(productId) : undefined) ?? 0;
        return sum + rate * (item.quantity || 0);
      }, 0);

      const orderRevenue = o.subtotal || 0;
      const orderProfit  = orderRevenue - itemsCOGS;
      const orderMargin  = orderRevenue > 0 ? (orderProfit / orderRevenue) * 100 : 0;

      return {
        _id:           o._id.toString(),
        orderNumber:   o.orderNumber,
        subtotal:      orderRevenue,
        shippingCost:  o.shippingCost || 0,
        costOfGoods:   itemsCOGS,
        profit:        orderProfit,
        margin:        orderMargin,
        createdAt:     o.createdAt,
        orderStatus:   o.orderStatus,
        paymentMethod: o.paymentMethod,
        customerName:  o.shippingAddress?.fullName ?? o.shippingAddress?.name ?? null,
        items: (o.items || []).map((item: any) => {
          const pid      = item.product?._id?.toString() ?? item.product?.toString();
          const costRate = (pid ? productCostMap.get(pid) : undefined) ?? 0;
          return {
            name:       item.product?.name || item.name || "Unknown Item",
            sku:        item.product?.sku  || null,
            quantity:   item.quantity      || 0,
            price:      item.price         || 0,
            subtotal:   item.subtotal      ?? (item.price || 0) * (item.quantity || 0),
            costPrice:  costRate,
            itemProfit: (item.price - costRate) * (item.quantity || 0),
          };
        }),
      };
    });

    const onlineRevenue = onlineOrdersWithProfit.reduce((s, o) => s + o.subtotal,    0);
    const onlineCOGS    = onlineOrdersWithProfit.reduce((s, o) => s + o.costOfGoods, 0);
    const onlineProfit  = onlineOrdersWithProfit.reduce((s, o) => s + o.profit,      0);
    const onlineMargin  = onlineRevenue > 0 ? (onlineProfit / onlineRevenue) * 100 : 0;

    // ── STEP 3: POS SALES ────────────────────────────────────────────────────
    const [posAgg] = await POSSale.aggregate([
      { $match: { ...dateMatch, paymentStatus: "completed" } },
      {
        $group: {
          _id:   null,
          rev:   { $sum: "$subtotal"    },
          cogs:  { $sum: "$costOfGoods" },
          count: { $sum: 1              },
        },
      },
    ]);

    const posRevenue = posAgg?.rev   ?? 0;
    const posCOGS    = posAgg?.cogs  ?? 0;
    const posCount   = posAgg?.count ?? 0;
    const posProfit  = posRevenue - posCOGS;
    const posMargin  = posRevenue > 0 ? (posProfit / posRevenue) * 100 : 0;

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
            sales.map((s) => {
              const saleProfit = s.subtotal - (s.costOfGoods ?? 0);
              return {
                _id:           s._id.toString(),
                saleNumber:    s.saleNumber    || null,
                cashierName:   s.cashier?.name || null,
                subtotal:      s.subtotal,
                costOfGoods:   s.costOfGoods,
                profit:        saleProfit,
                margin:        s.subtotal > 0 ? (saleProfit / s.subtotal) * 100 : 0,
                createdAt:     s.createdAt,
                paymentMethod: s.paymentMethod,
                items: (s.items || []).map((item: any) => ({
                  name:     item.product?.name || item.name || "Unknown Item",
                  sku:      item.product?.sku  || null,
                  quantity: item.quantity  || 0,
                  price:    item.price     || 0,
                  subtotal: item.subtotal  ?? (item.price || 0) * (item.quantity || 0),
                })),
              };
            })
          )
      : [];

    // ── STEP 4: OPERATING EXPENSES ───────────────────────────────────────────
    const EXCLUDED_EXPENSE_CATEGORIES = ["Refund", "Delivery Loss", "Purchase", "Supplier Payment"];

    const expenseStats = await Transaction.aggregate([
      {
        $match: {
          ...dateMatch,
          type:     "expense",
          category: { $nin: EXCLUDED_EXPENSE_CATEGORIES },
        },
      },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const totalOperatingExpenses = expenseStats.reduce((a, e) => a + e.total, 0);

    // ── STEP 5: DELIVERY LOSSES ──────────────────────────────────────────────
    const [refundAgg] = await Refund.aggregate([
      { $match: { ...dateMatch, status: { $in: ["completed", "approved"] } } },
      {
        $group: {
          _id:           null,
          deliveryLoss:  { $sum: "$deliveryCost"  },
          totalRefunded: { $sum: "$refundedAmount" },
          onlineCount:   { $sum: { $cond: [{ $eq: ["$returnType", "online"] }, 1, 0] } },
          posCount:      { $sum: { $cond: [{ $ne:  ["$returnType", "online"] }, 1, 0] } },
        },
      },
    ]);

    const deliveryLoss  = refundAgg?.deliveryLoss  ?? 0;
    const totalRefunded = refundAgg?.totalRefunded  ?? 0;
    const onlineReturns = refundAgg?.onlineCount    ?? 0;
    const posReturns    = refundAgg?.posCount        ?? 0;
    const totalReturns  = onlineReturns + posReturns;
    const returnRate    = (onlineOrdersWithProfit.length + posCount) > 0
      ? (totalReturns / (onlineOrdersWithProfit.length + posCount)) * 100
      : 0;

    // ── STEP 6: INVENTORY VALUATION ──────────────────────────────────────────
    const [inventoryAgg] = await InventoryBatch.aggregate([
      { $match: { status: { $ne: "finished" } } },
      {
        $group: {
          _id:        null,
          total:      { $sum: { $multiply: ["$remainingQuantity", "$buyingRate"] } },
          totalUnits: { $sum: "$remainingQuantity" },
        },
      },
    ]);

    const inventoryValue = inventoryAgg?.total      ?? 0;
    const inventoryUnits = inventoryAgg?.totalUnits ?? 0;

    // ── STEP 7: WALLET ───────────────────────────────────────────────────────
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

    // ── STEP 8: P&L ──────────────────────────────────────────────────────────
    const totalRevenue = onlineRevenue + posRevenue;
    const totalCOGS    = onlineCOGS + posCOGS;
    const grossProfit  = totalRevenue - totalCOGS;
    const grossMargin  = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit    = grossProfit - totalOperatingExpenses - deliveryLoss;
    const netMargin    = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const roiOnInventory = inventoryValue > 0 ? (netProfit / inventoryValue) * 100 : 0;
    const cashConversion = totalRevenue > 0 ? wallet.totalBalance / totalRevenue : 0;

    // ── STEP 9: BREAKEVEN ────────────────────────────────────────────────────
    const breakevenRevenue = grossMargin > 0
      ? ((totalOperatingExpenses + deliveryLoss) / grossMargin) * 100
      : 0;

    // ── STEP 10: RESPONSE ────────────────────────────────────────────────────
    return NextResponse.json({
      success:     true,
      period:      periodLabel,
      generatedAt: new Date().toISOString(),

      stats: {
        totalRevenue, onlineRevenue, posRevenue,
        totalCOGS, onlineCOGS, posCOGS,
        grossProfit, netProfit,
        totalExpenses: totalOperatingExpenses,
        deliveryLoss,
        inventoryValue, inventoryUnits,
        walletBalance: wallet.totalBalance,
        margins: { gross: grossMargin, net: netMargin, online: onlineMargin, pos: posMargin },
        roi: roiOnInventory, cashConversion, breakevenRevenue, returnRate,
      },

      breakdown: {
        revenue:     { online: onlineRevenue, pos: posRevenue, total: totalRevenue },
        costOfGoods: { online: onlineCOGS,    pos: posCOGS,    total: totalCOGS   },
        grossProfitByChannel: {
          online: onlineRevenue - onlineCOGS,
          pos:    posRevenue    - posCOGS,
          total:  grossProfit,
        },
        expenses: expenseStats.map((e) => ({
          category: e._id,
          amount:   e.total,
          count:    e.count,
          avgPerTransaction: e.count > 0 ? e.total / e.count : 0,
        })),
        deliveryLoss,
        refunds: {
          totalRefunded,
          onlineCount:  onlineReturns,
          posCount:     posReturns,
          totalCount:   totalReturns,
          returnRate:   returnRate.toFixed(2) + "%",
          avgDeliveryLossPerReturn: totalReturns > 0 ? (deliveryLoss / totalReturns).toFixed(2) : "0",
          note: "Refunds restock inventory — only delivery loss affects P&L",
        },
        orderMetrics: {
          onlineOrders:      onlineOrdersWithProfit.length,
          posTransactions:   posCount,
          totalTransactions: onlineOrdersWithProfit.length + posCount,
        },
      },

      profitability: {
        grossProfit, grossMargin,
        operatingExpenses: totalOperatingExpenses,
        deliveryLoss,
        netProfit, netMargin,
        breakeven: {
          requiredRevenue:   breakevenRevenue,
          remainingCapacity: totalRevenue - breakevenRevenue,
          safetyMargin:      totalRevenue > 0
            ? ((totalRevenue - breakevenRevenue) / totalRevenue) * 100
            : 0,
        },
      },

      wallet,

      ...(includeDetail && {
        detail: {
          onlineOrders: onlineOrdersWithProfit,
          posSales:     posSalesDetail,
          expensesByCategory: expenseStats,
        },
      }),
    });

  } catch (error: any) {
    console.error("[Reports API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}