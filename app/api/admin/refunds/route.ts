import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Refund, Order } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// GET - Fetch all refunds
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const refunds = await Refund.find()
      .populate({
        path: "order",
        select: "orderNumber total items",
      })
      .populate({
        path: "approvedBy",
        select: "name",
      })
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    // Ensure we always return an array
    return NextResponse.json(refunds || [], { status: 200 });
  } catch (error) {
    console.error("[Refunds GET] Error:", error);
    // Return empty array on error to prevent parsing issues
    return NextResponse.json([], { status: 200 });
  }
}

// POST - Customer creates refund request
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
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check ownership (unless admin)
    if (order.user.toString() !== payload.userId && payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prevent refunds for POS sales
    if (order.isPOS) {
      return NextResponse.json(
        {
          error: "POS sales cannot be refunded online. Please visit store.",
        },
        { status: 400 },
      );
    }

    // Check for existing pending/approved refund
    const existingRefund = await Refund.findOne({
      order: orderId,
      status: { $in: ["pending", "approved", "completed"] },
    });

    if (existingRefund) {
      return NextResponse.json(
        {
          error: "This order already has a pending or approved refund request",
        },
        { status: 400 },
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
        message: "Refund request created successfully",
        refund,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Refunds POST] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create refund request",
      },
      { status: 500 },
    );
  }
}
