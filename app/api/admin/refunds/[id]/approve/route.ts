// FILE PATH: app/api/admin/refunds/[id]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  Refund, Order, POSSale, Product, InventoryBatch, Wallet, Transaction,
} from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

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

    // Populate order so we get paymentMethod + orderNumber
    const refund = await Refund.findById(id).populate("order");
    if (!refund)
      return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
    if (refund.status !== "pending")
      return NextResponse.json({ error: "Refund already processed" }, { status: 400 });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const returnItems: any[]  = refund.returnItems || [];
      const approvedAt           = new Date();

      // ── Amounts ───────────────────────────────────────────────────────────
      // Admin enters the NET amount to refund (after deducting delivery if needed).
      // deliveryLoss is recorded separately as an expense transaction.
      const finalRefundAmount = parseFloat(approvalAmount) || refund.requestedAmount;
      const parsedDeliveryLoss = parseFloat(deliveryLoss) || refund.deliveryCost || 0;

      // ── Resolve payment method → wallet field ─────────────────────────────
      let paymentMethod = "cash";
      if (refund.order) {
        paymentMethod = (refund.order as any).paymentMethod || "cash";
      } else if (refund.orderNumber) {
        const sale = await POSSale.findOne({ saleNumber: refund.orderNumber }).lean();
        if (sale) paymentMethod = (sale as any).paymentMethod || "cash";
      }

      const walletKeyMap: Record<string, string> = {
        cash:      "cash",
        cod:       "cash",   // COD cash
        bank:      "bank",
        card:      "bank",
        easypaisa: "easyPaisa",
        jazzcash:  "jazzCash",
      };
      const walletField = walletKeyMap[paymentMethod?.toLowerCase() || "cash"] || "cash";

      // Transaction source must match schema enum exactly
      const sourceMap: Record<string, string> = {
        cash:      "cash",
        bank:      "bank",
        easyPaisa: "easyPaisa",
        jazzCash:  "jazzCash",
      };
      const txSource = sourceMap[walletField] || "cash";

      // ── Mark returned items on source document ────────────────────────────
      if (refund.order) {
        // Online Order
        const orderId = (refund.order as any)._id;
        const order   = await Order.findById(orderId).session(session);
        if (order) {
          const orderItems: any[] = (order as any).items || [];
          for (const ri of returnItems) {
            const key = ri.productId?.toString?.();
            const idx = orderItems.findIndex((oi: any) =>
              key
                ? oi.product?.toString() === key
                : oi.name?.toLowerCase() === ri.name?.toLowerCase()
            );
            if (idx !== -1) {
              await Order.updateOne(
                { _id: orderId },
                { $set: {
                  [`items.${idx}.returned`]:    true,
                  [`items.${idx}.returnedAt`]:  approvedAt,
                  [`items.${idx}.returnedQty`]: ri.returnQty,
                }},
                { session }
              );
            }
          }
        }
      } else if (refund.orderNumber) {
        // POS Sale
        const posSale = await POSSale.findOne({ saleNumber: refund.orderNumber }).session(session);
        if (posSale) {
          const saleItems: any[] = (posSale as any).items || [];
          for (const ri of returnItems) {
            const key = ri.productId?.toString?.();
            const idx = saleItems.findIndex((si: any) =>
              key
                ? si.product?.toString() === key
                : si.name?.toLowerCase() === ri.name?.toLowerCase()
            );
            if (idx !== -1) {
              await POSSale.updateOne(
                { saleNumber: refund.orderNumber },
                { $set: {
                  [`items.${idx}.returned`]:    true,
                  [`items.${idx}.returnedAt`]:  approvedAt,
                  [`items.${idx}.returnedQty`]: ri.returnQty,
                }},
                { session }
              );
            }
          }
        }
      }

      // ── Restock ───────────────────────────────────────────────────────────
      let restockedCount = 0;
      for (const item of returnItems) {
        if (!item.restock) continue;

        // productId may be an ObjectId object or plain string — normalise safely
        const rawId    = item.productId?._id ?? item.productId;
        const productId = rawId?.toString?.();
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) continue;

        const product = await Product.findById(productId).session(session);
        if (!product) continue;

        product.stock += item.returnQty;
        await product.save({ session });

        const costPrice = parseFloat(item.unitPrice) || 0;
        await new InventoryBatch({
          product:           product._id,
          quantity:          item.returnQty,
          remainingQuantity: item.returnQty,
          buyingRate:        costPrice,
          baseRate:          costPrice,
          taxValue:          0,
          taxType:           "percent",
          freightPerUnit:    0,
          sellingPrice:      product.retailPrice || costPrice,
          profitPerUnit:     (product.retailPrice || costPrice) - costPrice,
          status:            "active",
          isReturn:          true,
        }).save({ session });

        restockedCount++;
      }

      // ── Deduct from wallet ────────────────────────────────────────────────
      let wallet = await Wallet.findOne().session(session);
      if (!wallet)
        wallet = new Wallet({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0 });

      (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) - finalRefundAmount;
      wallet.lastUpdated = new Date();
      await wallet.save({ session });

      // ── Delivery loss → separate expense transaction ───────────────────────
      const orderRef = (refund.order as any)?.orderNumber || refund.orderNumber || "N/A";
      if (parsedDeliveryLoss > 0) {
        await new Transaction({
          type:           "expense",
          category:       "Delivery Loss",
          amount:         parsedDeliveryLoss,
          source:         txSource,
          reference:      refund._id,
          referenceModel: "Refund",
          description:    `Delivery loss on return for ${refund.returnType === "online" ? "Order" : "Sale"} #${orderRef}`,
          notes:          `Delivery cost not recovered — charged to business`,
          createdBy:      payload.userId,
        }).save({ session });
      }

      // ── Main refund expense transaction ───────────────────────────────────
      await new Transaction({
        type:           "expense",
        category:       "Refund",
        amount:         finalRefundAmount,
        source:         txSource,
        reference:      refund._id,
        referenceModel: "Refund",
        description:    `Refund for ${refund.returnType === "online" ? "Order" : "Sale"} #${orderRef} — ${returnItems.length} item(s)${parsedDeliveryLoss > 0 ? `, Rs.${parsedDeliveryLoss} delivery loss recorded separately` : ""}`,
        notes:          notes || `Approved ${refund.returnType === "online" ? "online" : "POS"} return`,
        createdBy:      payload.userId,
      }).save({ session });

      // ── Update refund ─────────────────────────────────────────────────────
      refund.status         = "completed";
      refund.approvedBy     = payload.userId;
      refund.approvedAt     = approvedAt;
      refund.refundedAmount = finalRefundAmount;
      refund.deliveryCost   = parsedDeliveryLoss;
      refund.notes          = notes || "Approved by admin";
      await refund.save({ session });

      await session.commitTransaction();

      return NextResponse.json({
        success:       true,
        message:       `Refund approved! Rs.${finalRefundAmount.toLocaleString()} refunded. ${restockedCount} item(s) restocked.${parsedDeliveryLoss > 0 ? ` Rs.${parsedDeliveryLoss} delivery loss recorded.` : ""}`,
        refund,
        refundAmount:  finalRefundAmount,
        deliveryLoss:  parsedDeliveryLoss,
        restockedCount,
        walletBalance: (wallet as any)[walletField],
      }, { status: 200 });

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Refund approval error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve refund" },
      { status: 500 }
    );
  }
}