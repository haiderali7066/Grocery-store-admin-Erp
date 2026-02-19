// app/api/admin/orders/[id]/route.ts
import { connectDB } from "@/lib/db";
import { Order, Wallet, Transaction, InventoryBatch } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { restockItems } from "@/lib/services/stockService";
import mongoose from "mongoose";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// Statuses that should trigger a restock
const RESTOCK_STATUSES = ["cancelled", "failed"];

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

export async function GET(req: NextRequest, context: { params: any }) {
  try {
    await connectDB();

    const { params } = context;
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload)
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    if (!isValidObjectId(orderId))
      return NextResponse.json(
        { message: "Invalid order ID" },
        { status: 400 },
      );

    const order = (await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate(
        "items.product",
        "name retailPrice unitSize unitType discount images",
      )
      .lean()) as any;

    if (!order)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (
      payload.role !== "admin" &&
      order.user?._id.toString() !== payload.userId
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: any }) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || !["admin", "manager", "staff"].includes(payload.role)) {
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

    const body = await req.json();

    // Get the current order before updating
    const existingOrder = (await Order.findById(orderId)
      .populate("items.product")
      .lean()) as any;
    if (!existingOrder) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const previousOrderStatus = existingOrder.orderStatus;
    const previousPaymentStatus = existingOrder.paymentStatus;
    const newOrderStatus = body.orderStatus;
    const newPaymentStatus = body.paymentStatus;

    // ── Restock Logic ──────────────────────────────────────────────────────
    const isAlreadyRestocked =
      RESTOCK_STATUSES.includes(previousOrderStatus) ||
      RESTOCK_STATUSES.includes(previousPaymentStatus);

    const shouldRestock =
      !isAlreadyRestocked &&
      ((newOrderStatus &&
        RESTOCK_STATUSES.includes(newOrderStatus) &&
        !RESTOCK_STATUSES.includes(previousOrderStatus)) ||
        (newPaymentStatus === "failed" && previousPaymentStatus !== "failed"));

    if (shouldRestock && existingOrder.items?.length > 0) {
      console.log(
        `🔄 Restocking for order ${orderId} - Status: ${newOrderStatus || newPaymentStatus}`,
      );

      await restockItems(
        existingOrder.items.map((item: any) => ({
          productId: item.product.toString(),
          quantity: item.quantity,
        })),
      );
    }

    // ── Add to Wallet When Approving (paymentStatus -> verified) ──────────
    const isBeingApproved =
      newPaymentStatus === "verified" && previousPaymentStatus === "pending";

    if (isBeingApproved) {
      console.log(`💰 Approving order ${orderId} - Adding to wallet`);

      // Calculate profit
      const profit = await calculateOrderProfit(existingOrder);

      // Get wallet
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

      // Determine which wallet to credit based on payment method
      const paymentMethod =
        existingOrder.paymentMethod?.toLowerCase() || "bank";
      const orderTotal = existingOrder.total || 0;
      const shippingCost = existingOrder.shippingCost || 0;
      const amountForWallet = orderTotal - shippingCost; // Exclude shipping

      // Map payment method to wallet field
      const walletFieldMap: Record<string, keyof typeof wallet> = {
        bank: "bank",
        easypaisa: "easyPaisa",
        jazzcash: "jazzCash",
        card: "card",
      };

      const walletField = walletFieldMap[paymentMethod] || "bank";

      // Add to appropriate wallet
      (wallet as any)[walletField] += amountForWallet;
      wallet.lastUpdated = new Date();
      await wallet.save();

      // Create transaction record
      await Transaction.create({
        type: "income",
        category: "Online Order Payment",
        amount: amountForWallet,
        source:
          walletField === "easyPaisa"
            ? "easypaisa"
            : walletField === "jazzCash"
              ? "jazzcash"
              : walletField,
        reference: existingOrder._id,
        referenceModel: "Order",
        description: `Payment verified for Order #${existingOrder.orderNumber} (Total: Rs. ${orderTotal}, Shipping: Rs. ${shippingCost}, Net: Rs. ${amountForWallet}, Profit: Rs. ${profit.toFixed(2)})`,
        notes: `Approved online payment via ${paymentMethod.toUpperCase()}. Delivery charges (Rs. ${shippingCost}) excluded from wallet.`,
        createdBy: payload.userId,
      });

      // Update order with profit
      body.profit = profit;

      console.log(
        `✅ Added Rs. ${amountForWallet} to ${walletField} wallet (Profit: Rs. ${profit})`,
      );
    }

    // Update the order
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: body },
      { new: true },
    )
      .populate("user", "name email phone")
      .populate(
        "items.product",
        "name retailPrice unitSize unitType discount images",
      )
      .lean();

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    console.error("Patch order error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: any }) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || payload.role !== "admin") {
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

    const order = (await Order.findById(orderId).lean()) as any;
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // ── Restock on Delete ──────────────────────────────────────────────────
    const alreadyRestocked =
      RESTOCK_STATUSES.includes(order.orderStatus) ||
      RESTOCK_STATUSES.includes(order.paymentStatus);

    if (!alreadyRestocked && order.items?.length > 0) {
      console.log(`🔄 Restocking on delete for order ${orderId}`);

      await restockItems(
        order.items.map((item: any) => ({
          productId: item.product.toString(),
          quantity: item.quantity,
        })),
      );
    }

    await Order.findByIdAndDelete(orderId);

    return NextResponse.json(
      { message: "Order deleted and stock restored successfully" },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Delete order error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
