// app/api/admin/refunds/manual/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  Refund, Product, Wallet, InventoryBatch, Order, POSSale,
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
    const { orderNumber, reason, notes, items, paymentMethod, orderType } = body;

    if (!orderNumber)
      return NextResponse.json({ error: "orderNumber is required" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });

    // ── Per-item one-return guard (checked against Refund collection) ─────────
    // This is the SOURCE OF TRUTH — we always check DB, never trust client state
    const existingRefunds = await Refund.find({
      orderNumber,
      status: { $in: ["completed", "approved"] },
    }).lean();

    const alreadyReturnedKeys = new Set<string>();
    for (const r of existingRefunds) {
      for (const ri of (r as any).returnItems || []) {
        const key = ri.productId?.toString() || ri.name;
        if (key) alreadyReturnedKeys.add(key);
      }
    }

    const errors: string[] = [];
    for (const item of items) {
      const key = item.productId?.toString() || item.name;
      const requestedQty = parseInt(item.returnQty) || 0;
      if (alreadyReturnedKeys.has(key)) {
        errors.push(`"${item.name}" has already been returned and cannot be returned again.`);
      } else if (requestedQty <= 0) {
        errors.push(`"${item.name}" has invalid quantity.`);
      }
    }

    if (errors.length > 0)
      return NextResponse.json({ error: errors.join(" | ") }, { status: 400 });

    // ── Find the source order/sale ─────────────────────────────────────────────
    // Use findOne WITHOUT .lean() so we can mutate and save
    const posSale = await POSSale.findOne({ saleNumber: orderNumber });
    const onlineOrder = !posSale ? await Order.findOne({ orderNumber }) : null;

    if (!posSale && !onlineOrder)
      return NextResponse.json({ error: "Source order/sale not found" }, { status: 404 });

    // ── Process in a transaction ───────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const returnItems: any[] = [];
      let totalRefundAmount = 0;
      const returnedAt = new Date();

      for (const item of items) {
        if (!item.name || !item.returnQty || item.returnQty <= 0)
          throw new Error(`Invalid item: ${JSON.stringify(item)}`);

        const lineTotal = (parseFloat(item.unitPrice) || 0) * parseInt(item.returnQty);
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

      // ── Mark returned items on POS sale using atomic $set ─────────────────
      // We use updateOne with positional $ operator to avoid subdocument schema issues.
      // This works regardless of whether the items schema has `returned` defined.
      if (posSale) {
        for (const returnItem of returnItems) {
          const matchKey = returnItem.productId?.toString();
          const matchName = returnItem.name?.toLowerCase();

          // Find the index of the matching item in the array
          const saleItems: any[] = (posSale as any).items || [];
          const matchIndex = saleItems.findIndex((saleItem: any) => {
            const saleProductId = saleItem.product?.toString();
            const saleItemName = saleItem.name?.toLowerCase();
            return matchKey
              ? saleProductId === matchKey
              : saleItemName === matchName;
          });

          if (matchIndex !== -1) {
            // Use MongoDB's positional update via updateOne to bypass Mongoose schema restrictions
            await POSSale.updateOne(
              { saleNumber: orderNumber },
              {
                $set: {
                  [`items.${matchIndex}.returned`]: true,
                  [`items.${matchIndex}.returnedAt`]: returnedAt,
                  [`items.${matchIndex}.returnedQty`]: returnItem.returnQty,
                },
              },
              { session }
            );
          }
        }
      }

      // ── Mark returned items on online Order ────────────────────────────────
      if (onlineOrder) {
        const orderItems: any[] = (onlineOrder as any).items || [];
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
              { orderNumber },
              {
                $set: {
                  [`items.${matchIndex}.returned`]: true,
                  [`items.${matchIndex}.returnedAt`]: returnedAt,
                  [`items.${matchIndex}.returnedQty`]: returnItem.returnQty,
                },
              },
              { session }
            );
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
          isReturn: true,
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
      (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) - totalRefundAmount;
      wallet.lastUpdated = new Date();
      await wallet.save({ session });

      // ── Save refund record ─────────────────────────────────────────────────
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
        approvedAt: returnedAt,
      });
      await refund.save({ session });

      await session.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          message: `Return processed! Rs. ${totalRefundAmount.toLocaleString()} refunded. ${returnItems.filter(i => i.restock).length} item(s) restocked.`,
          refund,
          refundAmount: totalRefundAmount,
          walletBalance: (wallet as any)[walletField],
        },
        { status: 201 }
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Manual return error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create manual return" },
      { status: 500 }
    );
  }
}