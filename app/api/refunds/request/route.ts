import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Refund, Order } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, reason } = body;

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: "Order ID and reason are required" },
        { status: 400 }
      );
    }

    // Validate order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check ownership (unless admin)
    if (
      order.user.toString() !== payload.userId &&
      payload.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "You can only request refunds for your own orders" },
        { status: 403 }
      );
    }

    // Prevent refunds for POS sales
    if (order.isPOS) {
      return NextResponse.json(
        { error: "Walk-in/POS sales cannot be refunded online. Please visit the store." },
        { status: 400 }
      );
    }

    // Check order status - only delivered/shipped orders can be refunded
    if (!["delivered", "shipped"].includes(order.orderStatus)) {
      return NextResponse.json(
        { error: `Cannot request refund for orders with status: ${order.orderStatus}` },
        { status: 400 }
      );
    }

    // Check if already has pending/approved refund
    const existingRefund = await Refund.findOne({
      order: orderId,
      status: { $in: ["pending", "approved", "completed"] },
    });

    if (existingRefund) {
      return NextResponse.json(
        {
          error:
            "This order already has a pending or approved refund request",
        },
        { status: 400 }
      );
    }

    // Create refund request
    const refund = new Refund({
      order: orderId,
      returnType: "online",
      requestedAmount: order.total,
      deliveryCost: 300, // Rs 300 delivery cost
      reason,
      status: "pending",
    });

    await refund.save();

    return NextResponse.json(
      {
        success: true,
        message:
          "Refund request submitted successfully. We will review and respond within 24 hours.",
        refund: {
          _id: refund._id,
          orderNumber: order.orderNumber,
          requestedAmount: refund.requestedAmount,
          deliveryCost: refund.deliveryCost,
          status: refund.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Refund Request] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit refund request",
      },
      { status: 500 }
    );
  }
}
