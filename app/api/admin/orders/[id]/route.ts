import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export async function PATCH(
  req: NextRequest,
  { params }: { params: any } // params is a Promise in App Router
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Unwrap params
    const resolvedParams = await params; // ✅ unwrap the Promise
    const orderId = resolvedParams.id;

    if (!isValidObjectId(orderId)) {
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();

    const order = await Order.findByIdAndUpdate(orderId, { $set: body }, { new: true })
      .populate("user", "name email phone")
      .lean();

    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    console.error("Patch order error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
