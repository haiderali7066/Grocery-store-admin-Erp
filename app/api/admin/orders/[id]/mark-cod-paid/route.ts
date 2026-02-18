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

    // Get batches in FIFO order to calculate actual cost
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

    const itemProfit = sellingPrice * quantity - totalCost;
    totalProfit += itemProfit;
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
      return NextResponse.json(
        { message: "Invalid order ID" },
        { status: 400 },
      );
    }

    const { amount, notes } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: "Valid amount is required" },
        { status: 400 },
      );
    }

    const order = await Order.findById(orderId).populate("items.product");
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.paymentMethod !== "cod") {
      return NextResponse.json(
        { message: "This is not a COD order" },
        { status: 400 },
      );
    }

    if (order.codPaymentStatus === "paid") {
      return NextResponse.json(
        { message: "COD payment already marked as paid" },
        { status: 400 },
      );
    }

    // Calculate profit
    const profit = await calculateOrderProfit(order);

    // Update order COD status and profit
    order.codPaymentStatus = "paid";
    order.codPaidAt = new Date();
    order.codPaidBy = new mongoose.Types.ObjectId(payload.userId);
    order.profit = profit;
    order.paymentStatus = "verified"; // Also mark payment as verified
    await order.save();

    // Add to wallet (cash by default for COD)
    let wallet = await Wallet.findOne();
    if (!wallet) {
      wallet = await Wallet.create({
        cash: 0,
        bank: 0,
        easyPaisa: 0,
        jazzCash: 0,
        card: 0,
      });
    }

    wallet.cash += amount;
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Create transaction record
    await Transaction.create({
      type: "income",
      category: "COD Order Payment",
      amount,
      source: "cash",
      reference: order._id,
      referenceModel: "Order",
      description: `COD payment received for Order #${order.orderNumber} (Profit: Rs. ${profit.toFixed(2)})`,
      notes: notes || `Collected from courier/rider`,
      createdBy: payload.userId,
    });

    return NextResponse.json(
      {
        message: "COD payment marked as received and added to wallet",
        order,
        profit: profit.toFixed(2),
        walletBalance: wallet.cash,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Mark COD paid error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
