// FILE PATH: app/api/admin/refunds/[id]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  Refund, Order, POSSale, Product, InventoryBatch, Wallet, Transaction,
} from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

// ── Safely extract a Mongo ID string from any shape Mongoose returns ──────────
function extractId(raw: any): string | null {
  if (!raw) return null;
  if (raw._id) return raw._id.toString();
  const str = raw.toString();
  if (!str || str === "[object Object]" || str.length < 12) return null;
  return str;
}

// ── Restore qty into the batch FIFO sold from — NOT a new batch ───────────────
//
// FIFO sells oldest-first. On return we put units back into:
//   1. The most-recently-finished batch (remainingQty=0 — FIFO just drained it)
//   2. Failing that, the oldest active batch (sale was a partial deduction)
//
// isReturn batches are excluded so we only touch real purchase batches.
//
async function restoreToOriginalBatch(
  productId: string,
  qty: number,
  session: mongoose.ClientSession,
): Promise<boolean> {
  const pid = new mongoose.Types.ObjectId(productId);

  // 1. Most recently drained batch
  let batch = await InventoryBatch.findOne({
    product:           pid,
    isReturn:          { $ne: true },
    remainingQuantity: 0,
  })
    .sort({ updatedAt: -1 })
    .session(session);

  if (!batch) {
    // 2. Oldest partially-remaining batch
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
    ` baseRate=${( batch as any).baseRate} remainingQty=${batch.remainingQuantity}`
  );
  return true;
}

const PAYMENT_TO_WALLET: Record<string, string> = {
  cash: "cash", cod: "cash", bank: "bank", card: "bank",
  easypaisa: "easyPaisa", jazzcash: "jazzCash",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !["admin", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { approvalAmount, deliveryLoss, notes } = await req.json();

    const refund = await Refund.findById(id).populate("order");
    if (!refund)
      return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
    if ((refund as any).status !== "pending")
      return NextResponse.json({ error: "Refund already processed" }, { status: 400 });

    const finalRefundAmount = parseFloat(approvalAmount) || (refund as any).requestedAmount || 0;
    const parsedDeliveryLoss =
      deliveryLoss !== undefined && deliveryLoss !== null
        ? Number(deliveryLoss) || 0
        : Number((refund as any).deliveryCost) || 0;

    // Wallet field
    let paymentMethod = "cash";
    if ((refund as any).order) {
      paymentMethod = ((refund as any).order as any).paymentMethod || "cash";
    } else if ((refund as any).orderNumber) {
      const sale = await POSSale.findOne({ saleNumber: (refund as any).orderNumber }).lean();
      if (sale) paymentMethod = (sale as any).paymentMethod || "cash";
    }
    const walletField = PAYMENT_TO_WALLET[paymentMethod.toLowerCase()] || "cash";

    // Build restock list — prefer returnItems, fall back to order.items
    const storedReturnItems: any[] = (refund as any).returnItems || [];
    type RI = { productId: string | null; name: string; returnQty: number; restock: boolean };
    let itemsToRestock: RI[] = [];

    if (storedReturnItems.length > 0) {
      itemsToRestock = storedReturnItems.map((ri: any) => ({
        productId: extractId(ri.productId),
        name:      ri.name || "Unknown",
        returnQty: ri.returnQty || ri.quantity || 0,
        restock:   ri.restock !== false,
      }));
    } else if ((refund as any).order) {
      console.warn("[Refund Approve] returnItems empty — falling back to order.items");
      const od = (refund as any).order as any;
      itemsToRestock = (od.items || []).map((oi: any) => ({
        productId: extractId(oi.product || oi.productId),
        name:      oi.name || "Unknown",
        returnQty: oi.quantity || 0,
        restock:   true,
      }));
    }

    console.log("[Refund Approve] items:", itemsToRestock.map(i => `${i.name}(${i.productId})×${i.returnQty}`));

    const session    = await mongoose.startSession();
    const approvedAt = new Date();
    session.startTransaction();

    try {
      // 1. Mark returned on source doc
      if ((refund as any).order) {
        const orderId    = ((refund as any).order as any)._id;
        const order      = await Order.findById(orderId).session(session);
        const orderItems: any[] = (order as any)?.items || [];
        for (const ri of itemsToRestock) {
          const idx = ri.productId
            ? orderItems.findIndex((oi: any) => extractId(oi.product || oi.productId) === ri.productId)
            : orderItems.findIndex((oi: any) => oi.name?.toLowerCase() === ri.name?.toLowerCase());
          if (idx !== -1)
            await Order.updateOne(
              { _id: orderId },
              { $set: { [`items.${idx}.returned`]: true, [`items.${idx}.returnedAt`]: approvedAt, [`items.${idx}.returnedQty`]: ri.returnQty }},
              { session }
            );
        }
      } else if ((refund as any).orderNumber) {
        const posSale    = await POSSale.findOne({ saleNumber: (refund as any).orderNumber }).session(session);
        const saleItems: any[] = (posSale as any)?.items || [];
        for (const ri of itemsToRestock) {
          const idx = ri.productId
            ? saleItems.findIndex((si: any) => extractId(si.product || si.productId) === ri.productId)
            : saleItems.findIndex((si: any) => si.name?.toLowerCase() === ri.name?.toLowerCase());
          if (idx !== -1)
            await POSSale.updateOne(
              { saleNumber: (refund as any).orderNumber },
              { $set: { [`items.${idx}.returned`]: true, [`items.${idx}.returnedAt`]: approvedAt, [`items.${idx}.returnedQty`]: ri.returnQty }},
              { session }
            );
        }
      }

      // 2. Restock — restore into original FIFO batch
      let restockedCount = 0;
      for (const item of itemsToRestock) {
        if (!item.restock) continue;
        if (!item.productId || !mongoose.Types.ObjectId.isValid(item.productId)) {
          console.warn(`[Refund Approve] skipping "${item.name}" — bad productId: ${item.productId}`);
          continue;
        }

        const product = await Product.findById(item.productId).session(session);
        if (!product) { console.warn(`[Refund Approve] product not found: ${item.productId}`); continue; }

        product.stock = (product.stock || 0) + item.returnQty;
        await product.save({ session });

        const ok = await restoreToOriginalBatch(item.productId, item.returnQty, session);
        if (!ok) {
          // Absolute last resort: no batches exist at all
          console.warn(`[Refund Approve] no batch found for "${item.name}" — creating fallback`);
          await InventoryBatch.create([{
            product: product._id, quantity: item.returnQty, remainingQuantity: item.returnQty,
            buyingRate: 0, baseRate: 0, taxValue: 0, taxType: "percent", freightPerUnit: 0,
            sellingPrice: product.retailPrice || 0, profitPerUnit: product.retailPrice || 0,
            status: "active", isReturn: true,
          }], { session });
        }
        restockedCount++;
      }

      // 3. Deduct wallet
      let wallet = await Wallet.findOne().session(session);
      if (!wallet) wallet = new (Wallet as any)({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0 });
      (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) - finalRefundAmount;
      (wallet as any).lastUpdated  = new Date();
      await wallet.save({ session });

      const orderRef = ((refund as any).order as any)?.orderNumber || (refund as any).orderNumber || "N/A";

      // 4. Delivery loss expense
      if (parsedDeliveryLoss > 0) {
        await Transaction.create([{
          type: "expense", category: "Delivery Loss", amount: parsedDeliveryLoss,
          source: walletField, reference: refund._id, referenceModel: "Refund",
          description: `Delivery loss — ${(refund as any).returnType === "online" ? "Order" : "Sale"} #${orderRef}`,
          notes: "Delivery cost not recovered — charged to business", createdBy: payload.userId,
        }], { session });
      }

      // 5. Refund expense
      await Transaction.create([{
        type: "expense", category: "Refund", amount: finalRefundAmount,
        source: walletField, reference: refund._id, referenceModel: "Refund",
        description: `Refund — ${(refund as any).returnType === "online" ? "Order" : "Sale"} #${orderRef} (${itemsToRestock.length} item(s))`,
        notes: notes || `Approved ${(refund as any).returnType} return`, createdBy: payload.userId,
      }], { session });

      // 6. Save refund
      (refund as any).status         = "completed";
      (refund as any).approvedBy     = payload.userId;
      (refund as any).approvedAt     = approvedAt;
      (refund as any).refundedAmount = finalRefundAmount;
      (refund as any).deliveryCost   = parsedDeliveryLoss;
      (refund as any).notes          = notes || "Approved by admin";
      await refund.save({ session });

      await session.commitTransaction();

      return NextResponse.json({
        success:       true,
        message:       `Refund approved! Rs. ${finalRefundAmount.toLocaleString()} refunded. ${restockedCount}/${itemsToRestock.length} item(s) restocked into original batches.${parsedDeliveryLoss > 0 ? ` Rs. ${parsedDeliveryLoss} delivery loss recorded.` : ""}`,
        refundAmount:  finalRefundAmount,
        deliveryLoss:  parsedDeliveryLoss,
        restockedCount,
        walletBalance: (wallet as any)[walletField],
      });

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("[Refund Approve]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve refund" },
      { status: 500 }
    );
  }
}