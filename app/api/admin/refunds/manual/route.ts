// FILE PATH: app/api/admin/refunds/manual/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// FIX: Now uses buildProductCostMap() as fallback for costPrice so POS returns
//      always show the correct cost and profit lost.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  Order, POSSale, Product, InventoryBatch, Wallet, Transaction, Refund,
} from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

function extractId(raw: any): string | null {
  if (!raw) return null;
  if (raw._id) return raw._id.toString();
  const str = raw.toString();
  if (!str || str === "[object Object]" || str.length < 12) return null;
  return str;
}

// ── Helper: Build productId → FIFO cost map (same as route.ts) ───────────────
async function buildProductCostMap(): Promise<Map<string, number>> {
  const allBatches = await InventoryBatch.find(
    {},
    { product: 1, buyingRate: 1, remainingQuantity: 1, status: 1, createdAt: 1 }
  ).sort({ createdAt: 1 }).lean() as any[];

  const productCostMap = new Map<string, number>();
  const batchesByProduct = new Map<string, any[]>();

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

  return productCostMap;
}

async function restoreToOriginalBatch(
  productId: string,
  qty: number,
  session: mongoose.ClientSession,
): Promise<boolean> {
  const pid = new mongoose.Types.ObjectId(productId);

  let batch = await InventoryBatch.findOne({
    product:           pid,
    isReturn:          { $ne: true },
    remainingQuantity: 0,
  })
    .sort({ updatedAt: -1 })
    .session(session);

  if (!batch) {
    batch = await InventoryBatch.findOne({
      product:           pid,
      isReturn:          { $ne: true },
      remainingQuantity: { $gt: 0 },
    })
      .sort({ createdAt: 1 })
      .session(session);
  }

  if (!batch) return false;

  batch.remainingQuantity += qty;
  if (batch.remainingQuantity > 0) (batch as any).status = "active";
  await batch.save({ session });

  console.log(
    `[restoreToOriginalBatch] ✓ ${qty}u → batch ${batch._id}` +
    ` baseRate=${(batch as any).baseRate} remainingQty=${batch.remainingQuantity}`
  );
  return true;
}

const PAYMENT_TO_WALLET: Record<string, string> = {
  cash: "cash", cod: "cash", bank: "bank", card: "bank",
  easypaisa: "easyPaisa", jazzcash: "jazzCash",
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !["admin", "manager", "staff"].includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { orderNumber, reason, notes, items, paymentMethod, orderType } = await req.json();

    if (!orderNumber || !reason || !items?.length)
      return NextResponse.json({ error: "orderNumber, reason, and items are required" }, { status: 400 });

    // ── Find source document ───────────────────────────────────────────────
    let sourceDoc: any = null;
    let docType: "order" | "pos" = "pos";

    sourceDoc = await Order.findOne({ orderNumber }).lean();
    if (sourceDoc) {
      docType = "order";
    } else {
      sourceDoc = await POSSale.findOne({ saleNumber: orderNumber }).lean();
      if (!sourceDoc)
        return NextResponse.json({ error: `Order/Sale "${orderNumber}" not found` }, { status: 404 });
    }

    // ── Per-item one-return guard ───────────────────────────────────────────
    const docItems: any[] = sourceDoc.items || [];
    const alreadyReturnedKeys = new Set<string>();

    for (const si of docItems) {
      if (si.returned) {
        const key = extractId(si.product || si.productId) || si.name;
        if (key) alreadyReturnedKeys.add(key);
      }
    }

    const existingRefunds = await Refund.find({
      $or: [
        { order: sourceDoc._id },
        { orderNumber },
      ],
      status: { $in: ["pending", "approved", "completed"] },
    }).lean();

    for (const r of existingRefunds) {
      for (const ri of (r as any).returnItems || []) {
        const key = extractId(ri.productId) || ri.name;
        if (key) alreadyReturnedKeys.add(key);
      }
    }

    const validItems = items.filter((item: any) => {
      const key = extractId(item.productId) || item.name;
      return key && !alreadyReturnedKeys.has(key);
    });

    if (validItems.length === 0)
      return NextResponse.json({ error: "All selected items have already been returned" }, { status: 400 });

    // ── Wallet field ──────────────────────────────────────────────────────
    const pm          = (paymentMethod || sourceDoc.paymentMethod || "cash").toLowerCase();
    const walletField = PAYMENT_TO_WALLET[pm] || "cash";

    // ── Build FIFO cost map as authoritative fallback ─────────────────────
    // FIX: POS sale items rarely store per-item costPrice; the batch map is
    //      the source of truth for buying rates.
    const productCostMap = await buildProductCostMap();

    // ── Enrich items with costPrice ───────────────────────────────────────
    const enrichedItems = validItems.map((item: any) => {
      const productId = extractId(item.productId);
      let unitPrice   = item.unitPrice || item.price || 0;
      let costPrice   = 0;

      // 1. Try to match the item in the source document
      const sourceItem = docItems.find((si: any) => {
        const sourceId = extractId(si.product || si.productId);
        return (sourceId && sourceId === productId) ||
               (si.name?.toLowerCase() === item.name?.toLowerCase());
      });

      if (sourceItem) {
        // Use price from source doc if caller didn't supply one
        unitPrice = sourceItem.price || unitPrice;
        // Some POS models store costPrice per item — use it if present
        costPrice = sourceItem.costPrice || sourceItem.cost || 0;
      }

      // 2. FIX: Fall back to FIFO batch map when source item has no costPrice
      //    (This is the common case for POS sales)
      if (!costPrice && productId) {
        costPrice = productCostMap.get(productId) ?? 0;
      }

      const returnQty = item.returnQty || item.quantity || 0;

      return {
        productId,
        name:         item.name,
        returnQty,
        unitPrice,
        costPrice,                           // ← now correctly populated
        profitPerUnit: unitPrice - costPrice, // ← now correctly calculated
        lineTotal:     unitPrice * returnQty,
        restock:       item.restock !== false,
      };
    });

    let refundAmount = 0;
    for (const item of enrichedItems) {
      refundAmount += item.unitPrice * item.returnQty;
    }

    // ── Atomic transaction ────────────────────────────────────────────────
    const session    = await mongoose.startSession();
    const returnedAt = new Date();
    session.startTransaction();

    try {
      let restockedCount = 0;

      for (const item of enrichedItems) {
        const productId = item.productId;
        const returnQty = item.returnQty;

        // Mark returned on source document
        if (docType === "order") {
          const idx = productId
            ? docItems.findIndex((di: any) => extractId(di.product || di.productId) === productId)
            : docItems.findIndex((di: any) => di.name?.toLowerCase() === item.name?.toLowerCase());
          if (idx !== -1)
            await Order.updateOne(
              { _id: sourceDoc._id },
              { $set: { [`items.${idx}.returned`]: true, [`items.${idx}.returnedAt`]: returnedAt, [`items.${idx}.returnedQty`]: returnQty }},
              { session }
            );
        } else {
          const idx = productId
            ? docItems.findIndex((di: any) => extractId(di.product || di.productId) === productId)
            : docItems.findIndex((di: any) => di.name?.toLowerCase() === item.name?.toLowerCase());
          if (idx !== -1)
            await POSSale.updateOne(
              { _id: sourceDoc._id },
              { $set: { [`items.${idx}.returned`]: true, [`items.${idx}.returnedAt`]: returnedAt, [`items.${idx}.returnedQty`]: returnQty }},
              { session }
            );
        }

        // Restock
        if (item.restock !== false && productId && mongoose.Types.ObjectId.isValid(productId)) {
          const product = await Product.findById(productId).session(session);
          if (product) {
            product.stock = (product.stock || 0) + returnQty;
            await product.save({ session });

            const ok = await restoreToOriginalBatch(productId, returnQty, session);
            if (!ok) {
              console.warn(`[Manual Return] no batch found for "${item.name}" — creating fallback`);
              await InventoryBatch.create([{
                product: product._id, quantity: returnQty, remainingQuantity: returnQty,
                buyingRate: 0, baseRate: 0, taxValue: 0, taxType: "percent", freightPerUnit: 0,
                sellingPrice: product.retailPrice || 0, profitPerUnit: product.retailPrice || 0,
                status: "active", isReturn: true,
              }], { session });
            }
            restockedCount++;
          }
        }
      }

      // Deduct wallet
      let wallet = await Wallet.findOne().session(session);
      if (!wallet) wallet = new (Wallet as any)({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0 });
      (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) - refundAmount;
      (wallet as any).lastUpdated  = new Date();
      await wallet.save({ session });

      // Refund Transaction
      await Transaction.create([{
        type:           "expense",
        category:       "Refund",
        amount:         refundAmount,
        source:         walletField,
        description:    `Manual return — ${docType === "order" ? "Order" : "Sale"} #${orderNumber} (${validItems.length} item(s))`,
        notes:          notes || reason,
        createdBy:      payload.userId,
      }], { session });

      // Refund record — enrichedItems now carry correct costPrice & profitPerUnit
      const refundDoc = await Refund.create([{
        order:           docType === "order" ? sourceDoc._id : undefined,
        orderNumber:     docType === "pos"   ? orderNumber   : undefined,
        returnType:      docType === "order" ? "online"      : "pos_manual",
        requestedAmount: refundAmount,
        refundedAmount:  refundAmount,
        deliveryCost:    0,
        reason,
        notes:           notes || reason,
        returnItems:     enrichedItems,
        status:          "completed",
        approvedBy:      payload.userId,
        approvedAt:      returnedAt,
      }], { session });

      await session.commitTransaction();

      // Total profit lost for response message
      const profitLost = enrichedItems.reduce(
        (sum, item) => sum + (item.profitPerUnit * item.returnQty), 0
      );

      return NextResponse.json({
        success:       true,
        message:       `Return processed. Rs. ${refundAmount.toLocaleString()} refunded. Profit lost: Rs. ${profitLost.toLocaleString()}. ${restockedCount} item(s) restocked into original batches.`,
        refundAmount,
        profitLost,
        restockedCount,
        refund:        refundDoc[0],
        walletBalance: (wallet as any)[walletField],
      }, { status: 201 });

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("[Manual Return]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process return" },
      { status: 500 }
    );
  }
}