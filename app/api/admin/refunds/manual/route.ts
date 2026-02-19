// app/api/admin/refunds/manual/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  Refund,
  Product,
  Wallet,
  Transaction,
  InventoryBatch,
} from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !["admin", "manager", "staff"].includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { orderNumber, reason, notes, items, paymentMethod, orderType } =
      body;

    if (!orderNumber)
      return NextResponse.json(
        { error: "orderNumber is required" },
        { status: 400 },
      );

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 },
      );

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate and process items
      const returnItems: any[] = [];
      let totalRefundAmount = 0;

      for (const item of items) {
        if (!item.name || !item.returnQty || item.returnQty <= 0)
          throw new Error(`Invalid item: ${JSON.stringify(item)}`);

        const lineTotal =
          (parseFloat(item.unitPrice) || 0) * parseInt(item.returnQty);
        totalRefundAmount += lineTotal;

        returnItems.push({
          productId: item.productId || null,
          name: item.name,
          returnQty: parseInt(item.returnQty),
          unitPrice: parseFloat(item.unitPrice) || 0,
          lineTotal,
          restock: item.restock !== false,
        });
      }

      if (totalRefundAmount <= 0)
        throw new Error("Return amount must be greater than 0");

      // Restock items
      for (const item of returnItems) {
        if (item.restock && item.productId) {
          const product = await Product.findById(item.productId).session(
            session,
          );

          if (product) {
            // Add stock back to product
            product.stock += item.returnQty;
            await product.save({ session });

            // Create new inventory batch for returned items
            const costPrice = parseFloat(item.unitPrice) || 0;
            const batch = new InventoryBatch({
              product: product._id,
              quantity: item.returnQty,
              remainingQuantity: item.returnQty,
              buyingRate: costPrice,
              baseRate: costPrice,
              taxValue: 0,
              taxType: "percent",
              freightPerUnit: 0,
              sellingPrice: product.retailPrice || costPrice * 1.2,
              profitPerUnit:
                (product.retailPrice || costPrice * 1.2) - costPrice,
              status: "active",
            });

            await batch.save({ session });
          }
        }
      }

      // Update wallet - deduct refund amount
      let wallet = await Wallet.findOne().session(session);
      if (!wallet) {
        wallet = new Wallet({
          cash: 0,
          bank: 0,
          easyPaisa: 0,
          jazzCash: 0,
          card: 0,
        });
      }

      const walletFieldMap: Record<string, keyof typeof wallet> = {
        cash: "cash",
        bank: "bank",
        easypaisa: "easyPaisa",
        jazzcash: "jazzCash",
        card: "card",
      };

      const walletField =
        walletFieldMap[paymentMethod?.toLowerCase()] || "cash";
      const currentBalance = (wallet as any)[walletField] || 0;

      (wallet as any)[walletField] = currentBalance - totalRefundAmount;
      wallet.lastUpdated = new Date();
      await wallet.save({ session });

      // Create refund record
      const refund = new Refund({
        orderNumber,
        returnType: orderType === "online" ? "online" : "pos_manual",
        requestedAmount: totalRefundAmount,
        refundedAmount: totalRefundAmount,
        deliveryCost: 0,
        reason: reason || "pos_return",
        notes: notes || "",
        returnItems,
        status: "completed",
        approvedBy: payload.userId,
        approvedAt: new Date(),
      });

      await refund.save({ session });

      // Create transaction record
      await Transaction.create(
        [
          {
            type: "expense",
            category: "Refund",
            amount: totalRefundAmount,
            source:
              walletField === "easyPaisa"
                ? "easypaisa"
                : walletField === "jazzCash"
                  ? "jazzcash"
                  : walletField,
            reference: refund._id,
            referenceModel: "Refund",
            description: `Manual return for ${orderNumber} (${items.length} items)`,
            notes:
              notes ||
              `Refunded Rs. ${totalRefundAmount.toLocaleString()} via ${paymentMethod}. Items restocked.`,
            createdBy: payload.userId,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          message: `Return processed successfully! Rs. ${totalRefundAmount.toLocaleString()} refunded and ${returnItems.filter((i) => i.restock).length} items restocked.`,
          refund,
          refundAmount: totalRefundAmount,
          walletBalance: (wallet as any)[walletField],
        },
        { status: 201 },
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Manual return error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create manual return",
      },
      { status: 500 },
    );
  }
}
