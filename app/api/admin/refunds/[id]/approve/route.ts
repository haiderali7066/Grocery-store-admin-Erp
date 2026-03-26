// FILE PATH: app/api/admin/refunds/[id]/approve/route.ts (FIXED FOR ONLINE REFUNDS)
// ═══════════════════════════════════════════════════════════════════════════════
// FIX: Ensure returnItems are preserved with costPrice when saving approved refund
//      so reports endpoint can calculate returnedProfit correctly
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  Refund, Order, POSSale, Product, InventoryBatch, Wallet, Transaction,
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

    // ── Build restock list with cost data ───────────────────────────────────
    const storedReturnItems: any[] = (refund as any).returnItems || [];
    type RI = { productId: string | null; name: string; returnQty: number; costPrice: number; unitPrice: number; profitPerUnit: number; restock: boolean };
    let itemsToRestock: RI[] = [];

    const costMap = await buildProductCostMap();

    if (storedReturnItems.length > 0) {
      // ← FIX: Use stored returnItems with costPrice preserved
      itemsToRestock = storedReturnItems.map((ri: any) => {
        const pid = extractId(ri.productId);
        // Use stored costPrice if present (from creation route), else fall back to batch map
        const costPrice = ri.costPrice ?? (pid ? costMap.get(pid) ?? 0 : 0);
        return {
          productId: pid,
          name:      ri.name || "Unknown",
          returnQty: ri.returnQty || ri.quantity || 0,
          costPrice: costPrice,
          unitPrice: ri.unitPrice || ri.price || 0,
          profitPerUnit: (ri.profitPerUnit ?? ((ri.unitPrice || ri.price || 0) - costPrice)),
          restock:   ri.restock !== false,
        };
      });
    } else if ((refund as any).order) {
      console.warn("[Refund Approve] returnItems empty — falling back to order.items with batch cost lookup");
      const od = (refund as any).order as any;
      itemsToRestock = (od.items || []).map((oi: any) => {
        const pid = extractId(oi.product?._id || oi.product || oi.productId);
        const costPrice = pid ? costMap.get(pid) ?? 0 : 0;
        return {
          productId: pid,
          name:      oi.product?.name || oi.name || "Unknown",
          returnQty: oi.quantity || 0,
          costPrice: costPrice,
          unitPrice: oi.price || 0,
          profitPerUnit: (oi.price || 0) - costPrice,
          restock:   true,
        };
      });
    }

    console.log("[Refund Approve] items to restock:", itemsToRestock.map(i => 
      `${i.name}(${i.productId})×${i.returnQty} cost=${i.costPrice} profit=${i.profitPerUnit}`
    ));

    const session    = await mongoose.startSession();
    const approvedAt = new Date();
    session.startTransaction();

    try {
      let restockedCount = 0;

      for (const item of itemsToRestock) {
        const productId = item.productId;
        const returnQty = item.returnQty;

        // Mark returned on source doc
        if ((refund as any).order) {
          const orderId    = ((refund as any).order as any)._id;
          const order      = await Order.findById(orderId).session(session);
          const orderItems: any[] = (order as any)?.items || [];
          const actualIdx = productId
            ? orderItems.findIndex((oi: any) => extractId(oi.product?._id || oi.product || oi.productId) === productId)
            : orderItems.findIndex((oi: any) => oi.name?.toLowerCase() === item.name?.toLowerCase());
          if (actualIdx !== -1)
            await Order.updateOne(
              { _id: orderId },
              { $set: { [`items.${actualIdx}.returned`]: true, [`items.${actualIdx}.returnedAt`]: approvedAt, [`items.${actualIdx}.returnedQty`]: returnQty }},
              { session }
            );
        } else if ((refund as any).orderNumber) {
          const posSale    = await POSSale.findOne({ saleNumber: (refund as any).orderNumber }).session(session);
          const saleItems: any[] = (posSale as any)?.items || [];
          const actualIdx = productId
            ? saleItems.findIndex((si: any) => extractId(si.product?._id || si.product || si.productId) === productId)
            : saleItems.findIndex((si: any) => si.name?.toLowerCase() === item.name?.toLowerCase());
          if (actualIdx !== -1)
            await POSSale.updateOne(
              { saleNumber: (refund as any).orderNumber },
              { $set: { [`items.${actualIdx}.returned`]: true, [`items.${actualIdx}.returnedAt`]: approvedAt, [`items.${actualIdx}.returnedQty`]: returnQty }},
              { session }
            );
        }

        // Restock
        if (item.restock && productId && mongoose.Types.ObjectId.isValid(productId)) {
          const product = await Product.findById(productId).session(session);
          if (product) {
            product.stock = (product.stock || 0) + returnQty;
            await product.save({ session });

            const ok = await restoreToOriginalBatch(productId, returnQty, session);
            if (!ok) {
              console.warn(`[Refund Approve] no batch found for "${item.name}" — creating fallback`);
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
      (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) - finalRefundAmount;
      (wallet as any).lastUpdated  = new Date();
      await wallet.save({ session });

      const orderRef = ((refund as any).order as any)?.orderNumber || (refund as any).orderNumber || "N/A";

      // Delivery loss expense
      if (parsedDeliveryLoss > 0) {
        await Transaction.create([{
          type: "expense", category: "Delivery Loss", amount: parsedDeliveryLoss,
          source: walletField, reference: refund._id, referenceModel: "Refund",
          description: `Delivery loss — ${(refund as any).returnType === "online" ? "Order" : "Sale"} #${orderRef}`,
          notes: "Delivery cost not recovered — charged to business", createdBy: payload.userId,
        }], { session });
      }

      // Refund expense
      await Transaction.create([{
        type: "expense", category: "Refund", amount: finalRefundAmount,
        source: walletField, reference: refund._id, referenceModel: "Refund",
        description: `Refund — ${(refund as any).returnType === "online" ? "Order" : "Sale"} #${orderRef} (${itemsToRestock.length} item(s))`,
        notes: notes || `Approved ${(refund as any).returnType} return`, createdBy: payload.userId,
      }], { session });

      // ← FIX: Save refund with returnItems that include costPrice preserved
      //        This ensures reports endpoint can calculate returnedProfit
      (refund as any).status         = "completed";
      (refund as any).approvedBy     = payload.userId;
      (refund as any).approvedAt     = approvedAt;
      (refund as any).refundedAmount = finalRefundAmount;
      (refund as any).deliveryCost   = parsedDeliveryLoss;
      (refund as any).notes          = notes || "Approved by admin";
      
      // ← Preserve or rebuild returnItems with costPrice if missing
      if (!storedReturnItems.length && itemsToRestock.length > 0) {
        (refund as any).returnItems = itemsToRestock.map(i => ({
          productId: i.productId,
          name: i.name,
          returnQty: i.returnQty,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          profitPerUnit: i.profitPerUnit,
          lineTotal: i.unitPrice * i.returnQty,
          restock: i.restock,
        }));
      }

      await refund.save({ session });

      await session.commitTransaction();

      // Calculate total profit lost for response
      const profitLost = itemsToRestock.reduce((sum, item) => 
        sum + ((item.unitPrice - item.costPrice) * item.returnQty), 0
      );

      console.log(`[Refund Approve] Saved refund ${id} with profit lost: Rs. ${profitLost}`);

      return NextResponse.json({
        success:       true,
        message:       `Refund approved! Rs. ${finalRefundAmount.toLocaleString()} refunded. Profit lost: Rs. ${profitLost.toLocaleString()}. ${restockedCount}/${itemsToRestock.length} item(s) restocked into original batches.${parsedDeliveryLoss > 0 ? ` Rs. ${parsedDeliveryLoss} delivery loss recorded.` : ""}`,
        refundAmount:  finalRefundAmount,
        profitLost,
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