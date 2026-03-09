// FILE PATH: app/api/admin/orders/[id]/mark-cod-paid/route.ts

import { connectDB } from "@/lib/db";
import { Order, Wallet, Transaction, InventoryBatch } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

function toProductId(product: any): string {
  if (!product) return "";
  if (typeof product === "object" && product._id) return product._id.toString();
  return product.toString();
}

// ✅ Fetch order WITHOUT populate so item.product is a raw ObjectId → no CastError
async function calculateOrderProfit(order: any): Promise<number> {
  let totalProfit = 0;

  for (const item of order.items) {
    if (!item.product) continue;

    const productId = toProductId(item.product);
    const qty       = item.quantity || 0;
    const sellPrice = item.price    || 0;
    let   remaining = qty;
    let   totalCost = 0;

    const batches = await InventoryBatch.find({
      product: new mongoose.Types.ObjectId(productId),
      status:  { $in: ["active", "partial", "finished"] },
    })
      .sort({ createdAt: 1 })
      .lean();

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.quantity);
      totalCost += take * (batch.buyingRate || 0);
      remaining -= take;
    }

    totalProfit += sellPrice * qty - totalCost;
  }

  return totalProfit;
}

export async function POST(req: NextRequest, { params }: { params: any }) {
  try {
    await connectDB();

    const payload = verifyToken(getTokenFromCookie(req.headers.get("cookie") || ""));
    if (!payload || !["admin", "manager"].includes(payload.role))
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const orderId = (await params).id;
    if (!isValidObjectId(orderId))
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });

    const { amount, notes } = await req.json();
    if (!amount || amount <= 0)
      return NextResponse.json({ message: "Valid amount is required" }, { status: 400 });

    // ✅ NO .populate() — keep item.product as raw ObjectId for profit calc
    const order = (await Order.findById(orderId).lean()) as any;
    if (!order)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (order.paymentMethod !== "cod")
      return NextResponse.json({ message: "This is not a COD order" }, { status: 400 });

    if (order.codPaymentStatus === "paid")
      return NextResponse.json({ message: "COD payment already marked as paid" }, { status: 400 });

    const codDeliveryCharge = order.codDeliveryCharge || 0;
    const shippingCost      = order.shippingCost      || 0;
    const isHybrid          = codDeliveryCharge > 0;

    // ✅ item.product is raw ObjectId — safe for InventoryBatch query
    const profit = await calculateOrderProfit(order);

    // Update order document
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        codPaymentStatus: "paid",
        codPaidAt:        new Date(),
        codPaidBy:        new mongoose.Types.ObjectId(payload.userId),
        profit,
        paymentStatus:    "verified",
      },
    });

    // Credit cash wallet
    let wallet = await Wallet.findOne();
    if (!wallet)
      wallet = await Wallet.create({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0, card: 0 });

    wallet.cash       += amount;
    wallet.lastUpdated = new Date();
    await wallet.save();

    await Transaction.create({
      type:           "income",
      category:       "COD Order Payment",
      amount,
      source:         "cash",
      reference:      order._id,
      referenceModel: "Order",
      description:    isHybrid
        ? `COD cash collected for Order #${order.orderNumber}. Advance Rs.${codDeliveryCharge} was paid via EasyPaisa. Rider handed Rs.${amount} cash. Profit: Rs.${profit.toFixed(2)}.`
        : `COD payment received for Order #${order.orderNumber}. Total: Rs.${order.total}, Shipping: Rs.${shippingCost}, Net: Rs.${amount}, Profit: Rs.${profit.toFixed(2)}.`,
      notes:
        notes ||
        (isHybrid
          ? `Hybrid COD — EasyPaisa advance Rs.${codDeliveryCharge} + cash Rs.${amount} from rider.`
          : `Full cash collected from rider. Delivery charges (Rs.${shippingCost}) excluded.`),
      createdBy: payload.userId,
    });

    return NextResponse.json(
      {
        message:                      "COD cash payment recorded successfully",
        profit:                       profit.toFixed(2),
        cashAmountReceived:           amount,
        codDeliveryChargeAlreadyPaid: codDeliveryCharge,
        totalOrderAmount:             order.total,
        walletCashBalance:            wallet.cash,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Mark COD paid error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}