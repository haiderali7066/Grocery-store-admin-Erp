import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  Refund,
  Order,
  POSSale,
  Product,
  InventoryBatch,
  Wallet,
  Transaction,
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
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    // Only admin and manager can approve refunds
    if (!payload || !["admin", "manager"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { approvalAmount, notes } = body;

    const refund = await Refund.findById(id).populate("order");
    if (!refund) {
      return NextResponse.json(
        { error: "Refund request not found" },
        { status: 404 },
      );
    }

    if (refund.status !== "pending") {
      return NextResponse.json(
        { error: "Refund already processed" },
        { status: 400 },
      );
    }

    // ── Process in a transaction ───────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const finalRefundAmount =
        parseFloat(approvalAmount) || refund.requestedAmount;

      // Determine source order/sale and get payment method
      let orderRef = null;
      let paymentMethod = "cash";
      let returnItems = refund.returnItems || [];

      if (refund.order) {
        // Online order
        const order = refund.order as any;
        orderRef = order._id;
        paymentMethod = order.paymentMethod || "cash";
      } else if (refund.orderNumber) {
        // POS sale
        const posSale = await POSSale.findOne({
          saleNumber: refund.orderNumber,
        }).session(session);

        if (posSale) {
          orderRef = posSale._id;
          paymentMethod = posSale.paymentMethod || "cash";
        }
      }

      const approvedAt = new Date();

      // ── Mark returned items on POS sale ────────────────────────────────────
      if (!refund.order && refund.orderNumber) {
        const posSale = await POSSale.findOne({
          saleNumber: refund.orderNumber,
        }).session(session);

        if (posSale) {
          for (const returnItem of returnItems) {
            const matchKey = returnItem.productId?.toString();
            const matchName = returnItem.name?.toLowerCase();

            const saleItems: any[] = (posSale as any).items || [];
            const matchIndex = saleItems.findIndex((saleItem: any) => {
              const saleProductId = saleItem.product?.toString();
              const saleItemName = saleItem.name?.toLowerCase();
              return matchKey
                ? saleProductId === matchKey
                : saleItemName === matchName;
            });

            if (matchIndex !== -1) {
              await POSSale.updateOne(
                { saleNumber: refund.orderNumber },
                {
                  $set: {
                    [`items.${matchIndex}.returned`]: true,
                    [`items.${matchIndex}.returnedAt`]: approvedAt,
                    [`items.${matchIndex}.returnedQty`]: returnItem.returnQty,
                  },
                },
                { session }
              );
            }
          }
        }
      }

      // ── Mark returned items on online Order ────────────────────────────────
      if (refund.order) {
        const order = await Order.findById(refund.order).session(session);

        if (order) {
          const orderItems: any[] = (order as any).items || [];
          for (const returnItem of returnItems) {
            const matchKey = returnItem.productId?.toString();
            const matchName = returnItem.name?.toLowerCase();

            const matchIndex = orderItems.findIndex((orderItem: any) => {
              const orderProductId = orderItem.product?.toString();
              const orderItemName = orderItem.name?.toLowerCase();
              return matchKey
                ? orderProductId === matchKey
                : orderItemName === matchName;
            });

            if (matchIndex !== -1) {
              await Order.updateOne(
                { _id: refund.order },
                {
                  $set: {
                    [`items.${matchIndex}.returned`]: true,
                    [`items.${matchIndex}.returnedAt`]: approvedAt,
                    [`items.${matchIndex}.returnedQty`]: returnItem.returnQty,
                  },
                },
                { session }
              );
            }
          }
        }
      }

      // ── Restock items ──────────────────────────────────────────────────────
      for (const item of returnItems) {
        if (!item.restock || !item.productId) continue;

        const product = await Product.findById(item.productId).session(session);
        if (!product) continue;

        product.stock += item.returnQty;
        await product.save({ session });

        const costPrice = parseFloat(item.unitPrice) || 0;
        const newBatch = new InventoryBatch({
          product: product._id,
          quantity: item.returnQty,
          remainingQuantity: item.returnQty,
          buyingRate: costPrice,
          baseRate: costPrice,
          taxValue: 0,
          taxType: "percent",
          freightPerUnit: 0,
          sellingPrice: product.retailPrice || costPrice,
          profitPerUnit: (product.retailPrice || costPrice) - costPrice,
          status: "active",
          isReturn: true, // Mark as return batch
        });
        await newBatch.save({ session });
      }

      // ── Deduct from wallet ─────────────────────────────────────────────────
      let wallet = await Wallet.findOne().session(session);
      if (!wallet) {
        wallet = new Wallet({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0 });
      }

      const walletKeyMap: Record<string, string> = {
        cash:      "cash",
        bank:      "bank",
        card:      "bank",
        easypaisa: "easyPaisa",
        jazzcash:  "jazzCash",
      };
      const walletField = walletKeyMap[paymentMethod?.toLowerCase() || "cash"] || "cash";
      (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) - finalRefundAmount;
      wallet.lastUpdated = new Date();
      await wallet.save({ session });

      // ── Update refund record ───────────────────────────────────────────────
      refund.status = "completed";
      refund.approvedBy = payload.userId;
      refund.approvedAt = approvedAt;
      refund.refundedAmount = finalRefundAmount;
      refund.notes = notes || "Approved by admin";
      await refund.save({ session });

      // ── CREATE TRANSACTION RECORD ──────────────────────────────────────────
      const transaction = new Transaction({
        type: "expense",
        category: "Refund",
        amount: finalRefundAmount,
        source: walletField,
        reference: refund._id,
        referenceModel: "Refund",
        description: `Refund for ${refund.returnType === "online" ? "Order" : "Sale"} #${refund.orderNumber || refund.order?.orderNumber} (${returnItems.length} item${returnItems.length > 1 ? "s" : ""})`,
        notes: notes || `Approved ${refund.returnType === "online" ? "online" : "POS"} return`,
        createdBy: payload.userId,
      });
      await transaction.save({ session });

      await session.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          message: `Refund approved! Rs. ${finalRefundAmount.toLocaleString()} refunded. ${returnItems.filter(i => i.restock).length} item(s) restocked.`,
          refund,
          refundAmount: finalRefundAmount,
          walletBalance: (wallet as any)[walletField],
          transactionId: transaction._id,
        },
        { status: 200 }
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Refund approval error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to approve refund",
      },
      { status: 500 }
    );
  }
}