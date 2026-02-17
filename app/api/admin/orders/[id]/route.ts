// app/api/admin/orders/[id]/route.ts
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { restockItems } from "@/lib/services/stockService";
import mongoose from "mongoose";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// Statuses that should trigger a restock
const RESTOCK_STATUSES = ["cancelled", "failed"];

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
    const existingOrder = (await Order.findById(orderId).lean()) as any;
    if (!existingOrder) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const previousOrderStatus = existingOrder.orderStatus;
    const previousPaymentStatus = existingOrder.paymentStatus;
    const newOrderStatus = body.orderStatus;
    const newPaymentStatus = body.paymentStatus;

    // ── Restock Logic ──────────────────────────────────────────────────────
    // Restock if:
    // 1. Order status changes TO cancelled
    // 2. Payment status changes TO failed (rejected)
    // Don't double-restock if already restocked
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

    // Update the order
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: body },
      { new: true },
    )
      .populate("user", "name email phone")
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
    // Only restock if order was NOT already cancelled/failed (already restocked)
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
