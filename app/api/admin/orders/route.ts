import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// GET all orders
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const orders = await Order.find(
      {},
      {
        orderNumber: 1,
        total: 1,
        paymentStatus: 1,
        orderStatus: 1,
        screenshot: 1,
        trackingCode: 1,
        courierName: 1,
        createdAt: 1,
        items: 1,
        user: 1,
      },
    )
      .populate("user", "name email phone")
      .populate("items.product", "name retailPrice unitSize unitType discount")
      .sort({ createdAt: -1 });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH: Approve/Reject payment and add tracking info
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { paymentStatus, trackingCode, courierName } = await req.json();

    const updateData: any = { paymentStatus };
    if (paymentStatus === "verified") {
      // Only generate tracking info if payment verified
      updateData.trackingCode = trackingCode || `TRK-${Date.now()}`;
      updateData.courierName = courierName || "Local Courier";
      updateData.orderStatus = "processing";
    } else if (paymentStatus === "failed") {
      updateData.orderStatus = "cancelled";
    }

    const order = await Order.findByIdAndUpdate(params.id, updateData, {
      new: true,
    });

    if (!order)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
