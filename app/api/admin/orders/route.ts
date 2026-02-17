// app/api/admin/orders/route.ts
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || !["admin", "manager", "staff"].includes(payload.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const orders = await Order.find({})
      .populate("user", "name email phone")
      .populate(
        "items.product",
        "name retailPrice unitSize unitType discount image",
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err: any) {
    console.error("Fetch orders error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
