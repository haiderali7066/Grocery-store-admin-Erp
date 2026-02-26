// app/api/admin/orders/[id]/route.ts
import { connectDB } from "@/lib/db";
import { Order, Wallet, Transaction, InventoryBatch } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { restockItems } from "@/lib/services/stockService";
import mongoose from "mongoose";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const RESTOCK_STATUSES = ["cancelled", "failed"];

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

export async function GET(req: NextRequest, context: { params: any }) {
  try {
    await connectDB();

    const { params } = context;
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    if (!isValidObjectId(orderId))
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });

    const order = (await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate("items.product", "name retailPrice unitSize unitType discount images")
      .lean()) as any;

    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (payload.role !== "admin" && order.user?._id.toString() !== payload.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
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
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();

    const existingOrder = (await Order.findById(orderId).populate("items.product").lean()) as any;
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
      console.log(`🔄 Restocking for order ${orderId}`);
      await restockItems(
        existingOrder.items.map((item: any) => ({
          productId: item.product.toString(),
          quantity: item.quantity,
        })),
      );
    }

    // ── Wallet credit when approving a NON-COD order ───────────────────────
    // For COD orders, wallet credit happens in mark-cod-paid route (cash portion)
    // and optionally here for the advance EasyPaisa portion (codDeliveryCharge).
    const isBeingApproved =
      newPaymentStatus === "verified" && previousPaymentStatus === "pending";

    if (isBeingApproved) {
      const isCOD = existingOrder.paymentMethod === "cod";
      const codDeliveryCharge = existingOrder.codDeliveryCharge || 0;
      const profit = await calculateOrderProfit(existingOrder);
      const orderTotal = existingOrder.total || 0;
      const shippingCost = existingOrder.shippingCost || 0;

      let wallet = await Wallet.findOne();
      if (!wallet) {
        wallet = await Wallet.create({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0, card: 0 });
      }

      if (isCOD) {
        // ── Hybrid COD approval ──────────────────────────────────────────
        // Admin verifies the EasyPaisa screenshot for the advance delivery charge.
        // Credit only the advance portion to easyPaisa wallet now.
        // The cash remainder will be credited when mark-cod-paid is called.
        if (codDeliveryCharge > 0) {
          console.log(
            `💰 Approving hybrid COD order ${orderId} — crediting Rs. ${codDeliveryCharge} EasyPaisa advance to wallet`,
          );

          wallet.easyPaisa += codDeliveryCharge;
          wallet.lastUpdated = new Date();
          await wallet.save();

          await Transaction.create({
            type: "income",
            category: "COD Advance Delivery Charge",
            amount: codDeliveryCharge,
            source: "easypaisa",
            reference: existingOrder._id,
            referenceModel: "Order",
            description: `COD advance delivery charge verified for Order #${existingOrder.orderNumber}. Rs. ${codDeliveryCharge} EasyPaisa screenshot confirmed. Remaining Rs. ${(orderTotal - codDeliveryCharge).toFixed(0)} to be collected on delivery.`,
            notes: `Hybrid COD — advance portion verified. Cash on delivery portion pending rider collection.`,
            createdBy: payload.userId,
          });

          console.log(`✅ Rs. ${codDeliveryCharge} credited to easyPaisa wallet`);
        } else {
          // Pure COD — no advance. Don't credit anything here.
          // Wallet credit happens entirely in mark-cod-paid.
          console.log(
            `ℹ️ Pure COD order ${orderId} approved — wallet credit deferred to mark-cod-paid`,
          );
        }
      } else {
        // ── Non-COD payment (bank / easypaisa / jazzcash) ─────────────────
        const paymentMethod = existingOrder.paymentMethod?.toLowerCase() || "bank";
        const amountForWallet = orderTotal - shippingCost;

        const walletFieldMap: Record<string, string> = {
          bank: "bank",
          easypaisa: "easyPaisa",
          jazzcash: "jazzCash",
          card: "card",
        };
        const walletField = walletFieldMap[paymentMethod] || "bank";

        (wallet as any)[walletField] += amountForWallet;
        wallet.lastUpdated = new Date();
        await wallet.save();

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
          notes: `Approved online payment via ${paymentMethod.toUpperCase()}. Delivery charges excluded.`,
          createdBy: payload.userId,
        });

        body.profit = profit;
        console.log(`✅ Added Rs. ${amountForWallet} to ${walletField} wallet`);
      }

      // Always set profit on approval
      body.profit = profit;
    }

    // Update the order
    const order = await Order.findByIdAndUpdate(orderId, { $set: body }, { new: true })
      .populate("user", "name email phone")
      .populate("items.product", "name retailPrice unitSize unitType discount images")
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
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });
    }

    const order = (await Order.findById(orderId).lean()) as any;
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

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