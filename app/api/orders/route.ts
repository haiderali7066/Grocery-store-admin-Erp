import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import {
  deductStock,
  checkStockAvailability,
} from "@/lib/services/stockService";

function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload)
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    const {
      items,
      shippingAddress,
      subtotal,
      gstAmount,
      total,
      paymentMethod,
      screenshot,
    } = await req.json();

    const stockCheck = await checkStockAvailability(
      items.map((i: any) => ({ productId: i.id, quantity: i.quantity })),
    );
    if (!stockCheck.available)
      return NextResponse.json(
        { message: "Insufficient stock" },
        { status: 400 },
      );

    const order = new Order({
      orderNumber: generateOrderNumber(),
      user: payload.userId,
      items: items.map((item: any) => ({
        product: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      })),
      shippingAddress,
      subtotal,
      gstAmount,
      total,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      paymentScreenshot: screenshot, // ✅ FIXED
    });

    await order.save();

    await deductStock(
      items.map((i: any) => ({ productId: i.id, quantity: i.quantity })),
    );

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
