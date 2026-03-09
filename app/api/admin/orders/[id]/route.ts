// FILE PATH: app/api/admin/orders/[id]/route.ts

import { connectDB } from "@/lib/db";
import { Order, Wallet, Transaction, InventoryBatch } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { restockItems } from "@/lib/services/stockService";
import mongoose from "mongoose";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);
const RESTOCK_STATUSES = ["cancelled", "failed"];

// Safely extract ObjectId string — works for raw ObjectId (lean) or populated plain-object.
function toProductId(product: any): string {
  if (!product) return "";
  if (typeof product === "object" && product._id) return product._id.toString();
  return product.toString();
}

// Guard before passing to new ObjectId() — prevents BSONError on empty/null/deleted products.
function isValidProductId(id: string): boolean {
  return !!id && mongoose.Types.ObjectId.isValid(id);
}

// ── Profit via FIFO batches ───────────────────────────────────────────────────
// Must be called with an order fetched WITHOUT .populate(), so item.product
// is a raw ObjectId (not a plain object) — safe to cast.
async function calculateOrderProfit(order: any): Promise<number> {
  let totalProfit = 0;

  for (const item of order.items) {
    const productId = toProductId(item.product);
    if (!isValidProductId(productId)) continue; // skip deleted/null products

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

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/admin/orders/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, context: { params: any }) {
  try {
    await connectDB();

    const orderId = (await context.params).id;
    const payload = verifyToken(getTokenFromCookie(req.headers.get("cookie") || ""));
    if (!payload) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isValidObjectId(orderId))
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });

    const order = (await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate("items.product", "name retailPrice unitSize unitType discount images")
      .lean()) as any;

    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (payload.role !== "admin" && order.user?._id.toString() !== payload.userId)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    return NextResponse.json({ order }, { status: 200 });
  } catch (err) {
    console.error("GET order error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH  /api/admin/orders/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: any }) {
  try {
    await connectDB();

    const payload = verifyToken(getTokenFromCookie(req.headers.get("cookie") || ""));
    if (!payload || !["admin", "manager", "staff"].includes(payload.role))
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const orderId = (await params).id;
    if (!isValidObjectId(orderId))
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });

    const body = await req.json();

    // ✅ NO .populate() — item.product stays as raw ObjectId.
    //    .populate() caused "[object Object]" in restockItems + CastError in profit calc.
    const existingOrder = (await Order.findById(orderId).lean()) as any;
    if (!existingOrder)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const prevOrderStatus   = existingOrder.orderStatus;
    const prevPaymentStatus = existingOrder.paymentStatus;
    const newOrderStatus    = body.orderStatus;
    const newPaymentStatus  = body.paymentStatus;

    // ── Restock ───────────────────────────────────────────────────────────
    const alreadyRestocked =
      RESTOCK_STATUSES.includes(prevOrderStatus) ||
      RESTOCK_STATUSES.includes(prevPaymentStatus);

    const shouldRestock =
      !alreadyRestocked &&
      ((newOrderStatus &&
        RESTOCK_STATUSES.includes(newOrderStatus) &&
        !RESTOCK_STATUSES.includes(prevOrderStatus)) ||
        (newPaymentStatus === "failed" && prevPaymentStatus !== "failed"));

    if (shouldRestock && existingOrder.items?.length > 0) {
      console.log(`🔄 Restocking order ${orderId}`);
      // Filter out items with null/deleted products to prevent restockItems from throwing
      const restockPayload = existingOrder.items
        .map((item: any) => ({ productId: toProductId(item.product), quantity: item.quantity }))
        .filter((item: any) => isValidProductId(item.productId));

      if (restockPayload.length > 0) {
        await restockItems(restockPayload);
      }
    }

    // ── Wallet credit on approval ─────────────────────────────────────────
    // FIX: also allow prevPaymentStatus to be undefined/null — COD orders may
    // be created without an explicit paymentStatus field.
    const isBeingApproved =
      newPaymentStatus === "verified" &&
      (prevPaymentStatus === "pending" || !prevPaymentStatus) &&
      prevPaymentStatus !== "verified"; // prevent double-crediting

    if (isBeingApproved) {
      const isCOD             = existingOrder.paymentMethod === "cod";
      const codDeliveryCharge = existingOrder.codDeliveryCharge || 0;
      const orderTotal        = existingOrder.total             || 0;
      const shippingCost      = existingOrder.shippingCost      || 0;

      // ✅ item.product is raw ObjectId — no CastError, no BSONError
      const profit = await calculateOrderProfit(existingOrder);

      let wallet = await Wallet.findOne();
      if (!wallet)
        wallet = await Wallet.create({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0, card: 0 });

      if (isCOD) {
        if (codDeliveryCharge > 0) {
          // Hybrid COD — credit EasyPaisa advance now; cash credited on mark-cod-paid
          wallet.easyPaisa  += codDeliveryCharge;
          wallet.lastUpdated = new Date();
          await wallet.save();

          await Transaction.create({
            type:           "income",
            category:       "COD Advance Delivery Charge",
            amount:         codDeliveryCharge,
            source:         "easyPaisa",      // ✅ enum: easyPaisa (camelCase)
            reference:      existingOrder._id,
            referenceModel: "Order",
            description:    `COD advance verified for Order #${existingOrder.orderNumber}. Rs.${codDeliveryCharge} EasyPaisa screenshot confirmed. Remaining Rs.${(orderTotal - codDeliveryCharge).toFixed(0)} to be collected on delivery.`,
            notes:          `Hybrid COD — advance verified. Cash portion pending rider collection.`,
            createdBy:      payload.userId,
          });

          console.log(`✅ Rs.${codDeliveryCharge} credited to easyPaisa wallet`);
        } else {
          // Pure COD — no advance paid; wallet credit deferred to mark-cod-paid
          console.log(`ℹ️ Pure COD ${orderId} approved — wallet credit deferred to mark-cod-paid`);
        }
      } else {
        // Non-COD payment (bank / easypaisa / jazzcash / card)
        const paymentMethod  = existingOrder.paymentMethod?.toLowerCase() || "bank";
        const amountToCredit = orderTotal - shippingCost;

        const walletFieldMap: Record<string, string> = {
          bank:      "bank",
          easypaisa: "easyPaisa",
          jazzcash:  "jazzCash",
          card:      "card",
        };
        const walletField = walletFieldMap[paymentMethod] || "bank";

        // ✅ enum values: bank | easyPaisa | jazzCash | card (all camelCase)
        const transactionSource =
          walletField === "easyPaisa" ? "easyPaisa"
          : walletField === "jazzCash" ? "jazzCash"
          : walletField; // "bank" or "card" — already valid

        (wallet as any)[walletField] += amountToCredit;
        wallet.lastUpdated = new Date();
        await wallet.save();

        await Transaction.create({
          type:           "income",
          category:       "Online Order Payment",
          amount:         amountToCredit,
          source:         transactionSource,
          reference:      existingOrder._id,
          referenceModel: "Order",
          description:    `Payment verified for Order #${existingOrder.orderNumber} (Total: Rs.${orderTotal}, Shipping: Rs.${shippingCost}, Net: Rs.${amountToCredit}, Profit: Rs.${profit.toFixed(2)})`,
          notes:          `Approved via ${paymentMethod.toUpperCase()}.`,
          createdBy:      payload.userId,
        });

        console.log(`✅ Rs.${amountToCredit} credited to ${walletField} wallet`);
      }

      body.profit = profit;
    }

    // Persist update; return with populated fields for the UI
    const order = await Order.findByIdAndUpdate(orderId, { $set: body }, { new: true })
      .populate("user", "name email phone")
      .populate("items.product", "name retailPrice unitSize unitType discount images")
      .lean();

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH order error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE  /api/admin/orders/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: any }) {
  try {
    await connectDB();

    const payload = verifyToken(getTokenFromCookie(req.headers.get("cookie") || ""));
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const orderId = (await params).id;
    if (!isValidObjectId(orderId))
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });

    // ✅ NO .populate() — item.product is a raw ObjectId
    const order = (await Order.findById(orderId).lean()) as any;
    if (!order)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const alreadyRestocked =
      RESTOCK_STATUSES.includes(order.orderStatus) ||
      RESTOCK_STATUSES.includes(order.paymentStatus);

    if (!alreadyRestocked && order.items?.length > 0) {
      const restockPayload = order.items
        .map((item: any) => ({ productId: toProductId(item.product), quantity: item.quantity }))
        .filter((item: any) => isValidProductId(item.productId));

      if (restockPayload.length > 0) {
        await restockItems(restockPayload);
      }
    }

    await Order.findByIdAndDelete(orderId);

    return NextResponse.json(
      { message: "Order deleted and stock restored successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("DELETE order error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}