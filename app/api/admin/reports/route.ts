// FILE PATH: app/api/admin/reports/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// FIX 1: "delivery" (lowercase) added to EXCLUDED_EXPENSE_CATEGORIES so
//         delivery expenses are never counted as operating expenses in P&L.
// FIX 2: returnedProfit deducted from netProfit (already present, preserved).
// ═══════════════════════════════════════════════════════════════════════════════

import { connectDB } from "@/lib/db";
import { Order, POSSale, Transaction, InventoryBatch, Wallet, Refund } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import moment from "moment";

function extractId(raw: any): string | null {
  if (!raw) return null;
  if (raw._id) return raw._id.toString();
  const str = raw.toString();
  if (!str || str === "[object Object]" || str.length < 12) return null;
  return str;
}

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

    // ── STEP 1: Build productId → FIFO cost map ────────────────────────────
    const allBatches = await InventoryBatch.find(
      {},
      { product: 1, buyingRate: 1, remainingQuantity: 1, status: 1, createdAt: 1 }
    ).sort({ createdAt: 1 }).lean() as any[];

    const productCostMap    = new Map<string, number>();
    const batchesByProduct  = new Map<string, any[]>();

    for (const b of allBatches) {
      const id = b.product?.toString();
      if (!id) continue;
      if (!batchesByProduct.has(id)) batchesByProduct.set(id, []);
      batchesByProduct.get(id)!.push(b);
    }

    for (const [id, batches] of batchesByProduct) {
      const current =
        batches.find(
          b => (b.remainingQuantity ?? 0) > 0 &&
               (b.status === "active" || b.status === "partial")
        ) ?? batches[batches.length - 1];
      productCostMap.set(id, current?.buyingRate ?? 0);
    }

    // ── STEP 2: ONLINE ORDERS ────────────────────────────────────────────────
    const rawOnlineOrders = await Order.find(
      { ...dateMatch, orderStatus: { $ne: "cancelled" } },
      {
        orderNumber: 1, subtotal: 1, shippingCost: 1, paymentMethod: 1,
        createdAt: 1, orderStatus: 1, shippingAddress: 1, items: 1,
      }
    )
      .populate("items.product", "name sku")
      .sort({ createdAt: -1 })
      .lean() as any[];

    const onlineOrdersWithProfit = rawOnlineOrders.map((o: any) => {
      const itemsCOGS = (o.items || []).reduce((sum: number, item: any) => {
        const productId = item.product?._id?.toString() ?? item.product?.toString();
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
    // FIX: Added "delivery" and "Delivery" so delivery expenses entered via the
    //      expenses form are excluded from operating P&L (they're a separate
    //      cost category, not a recurring operating expense).
    const EXCLUDED_EXPENSE_CATEGORIES = [
      "Refund",
      "Delivery Loss",
      "Purchase",
      "Supplier Payment",
      "delivery",   // ← FIX: lowercase as stored by the expenses form
      "Delivery",   // ← FIX: capitalised variant for safety
    ];

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

    // ── STEP 5: RETURNS — delivery loss & profit lost ─────────────────────
    const refundsInPeriod = await Refund.find({
      ...dateMatch,
      status: { $in: ["completed", "approved"] },
    }).lean() as any[];

    let deliveryLoss   = 0;
    let totalRefunded  = 0;
    let onlineReturns  = 0;
    let posReturns     = 0;
    let returnedProfit = 0;

    for (const refund of refundsInPeriod) {
      deliveryLoss  += refund.deliveryCost    || 0;
      totalRefunded += refund.refundedAmount  || 0;

      if (refund.returnType === "online") onlineReturns++;
      else posReturns++;

      // Sum profit lost from returned items
      // costPrice is now correctly captured by both route.ts and manual/route.ts
      for (const item of (refund.returnItems || [])) {
        const unitPrice = item.unitPrice    || 0;
        const costPrice = item.costPrice    || 0;
        const qty       = item.returnQty    || 0;
        returnedProfit += (unitPrice - costPrice) * qty;
      }
    }

    const totalReturns = onlineReturns + posReturns;
    const returnRate   = (onlineOrdersWithProfit.length + posCount) > 0
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

    // Net profit deducts: operating expenses + delivery losses + profit lost on returns
    const netProfit = grossProfit - totalOperatingExpenses - deliveryLoss - returnedProfit;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const roiOnInventory = inventoryValue > 0 ? (netProfit / inventoryValue) * 100 : 0;
    const cashConversion = totalRevenue > 0 ? wallet.totalBalance / totalRevenue : 0;

    // ── STEP 9: BREAKEVEN ────────────────────────────────────────────────────
    const breakevenRevenue = grossMargin > 0
      ? ((totalOperatingExpenses + deliveryLoss + returnedProfit) / grossMargin) * 100
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
        returnedProfit,
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
          profitLost:   returnedProfit,
          note: "Refunds restock inventory — delivery loss & profit loss affect P&L",
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
        returnedProfit,
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