// app/api/admin/orders/[id]/mark-cod-paid/route.ts
import { connectDB } from "@/lib/db";
import { Order, Wallet, Transaction, InventoryBatch } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// Calculate profit for the order based on FIFO cost
async function calculateOrderProfit(order: any): Promise<number> {
  let totalProfit = 0;

  for (const item of order.items) {
    if (!item.product) continue;

    const quantity = item.quantity;
    const sellingPrice = item.price;
    let remainingQty = quantity;
    let totalCost = 0;

    const batches = await InventoryBatch.find({
      product: item.product,
      status: { $in: ["active", "partial", "finished"] },
    })
      .sort({ createdAt: 1 })
      .lean();

    for (const batch of batches) {
      if (remainingQty <= 0) break;
      const qtyFromBatch = Math.min(remainingQty, batch.quantity);
      totalCost += qtyFromBatch * (batch.buyingRate || 0);
      remainingQty -= qtyFromBatch;
    }

    totalProfit += sellingPrice * quantity - totalCost;
  }

  return totalProfit;
}

export async function POST(req: NextRequest, { params }: { params: any }) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || !["admin", "manager"].includes(payload.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    if (!isValidObjectId(orderId)) {
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });
    }

    const { amount, notes } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ message: "Valid amount is required" }, { status: 400 });
    }

    const order = await Order.findById(orderId).populate("items.product");
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.paymentMethod !== "cod") {
      return NextResponse.json({ message: "This is not a COD order" }, { status: 400 });
    }

    if (order.codPaymentStatus === "paid") {
      return NextResponse.json({ message: "COD payment already marked as paid" }, { status: 400 });
    }

    // ── Hybrid COD accounting ─────────────────────────────────────────────
    // codDeliveryCharge was already collected via EasyPaisa (advance).
    // The `amount` passed here is what the rider collected in cash (remaining amount).
    // Full order total = codDeliveryCharge (EasyPaisa, already in wallet) + amount (cash now)
    const codDeliveryCharge = order.codDeliveryCharge || 0; // already credited to easyPaisa wallet when order was verified
    const shippingCost = order.shippingCost || 0;

    // The cash amount received from rider goes to cash wallet (excluding shipping)
    // Note: shippingCost was already subtracted from the advance if applicable,
    // here we just record what the rider handed over.
    const cashAmountForWallet = amount; // full rider handover goes to cash (no deduction here)

    // Calculate profit
    const profit = await calculateOrderProfit(order);

    // Update order
    order.codPaymentStatus = "paid";
    order.codPaidAt = new Date();
    order.codPaidBy = new mongoose.Types.ObjectId(payload.userId);
    order.profit = profit;
    order.paymentStatus = "verified";
    await order.save();

    // Credit cash wallet with rider's handover amount
    let wallet = await Wallet.findOne();
    if (!wallet) {
      wallet = await Wallet.create({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0, card: 0 });
    }

    wallet.cash += cashAmountForWallet;
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Transaction record
    const isHybrid = codDeliveryCharge > 0;
    await Transaction.create({
      type: "income",
      category: "COD Order Payment",
      amount: cashAmountForWallet,
      source: "cash",
      reference: order._id,
      referenceModel: "Order",
      description: isHybrid
        ? `COD cash collected for Order #${order.orderNumber}. Advance Rs. ${codDeliveryCharge} was paid via EasyPaisa at checkout. Rider handed Rs. ${amount} cash. Profit: Rs. ${profit.toFixed(2)}.`
        : `COD payment received for Order #${order.orderNumber}. Total: Rs. ${order.total}, Shipping: Rs. ${shippingCost}, Net: Rs. ${cashAmountForWallet}, Profit: Rs. ${profit.toFixed(2)}.`,
      notes:
        notes ||
        (isHybrid
          ? `Hybrid COD — EasyPaisa advance Rs. ${codDeliveryCharge} + cash Rs. ${amount} from rider.`
          : `Full cash collected from rider. Delivery charges (Rs. ${shippingCost}) excluded.`),
      createdBy: payload.userId,
    });

    return NextResponse.json(
      {
        message: "COD cash payment recorded successfully",
        order,
        profit: profit.toFixed(2),
        cashAmountReceived: amount,
        codDeliveryChargeAlreadyPaid: codDeliveryCharge,
        totalOrderAmount: order.total,
        walletCashBalance: wallet.cash,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Mark COD paid error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}