import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import {
  deductStock,
  checkStockAvailability,
} from "@/lib/services/stockService";

function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
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

    if (!items || items.length === 0)
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });

    // Check stock
    const stockCheck = await checkStockAvailability(
      items.map((i: any) => ({ productId: i.id, quantity: i.quantity })),
    );
    if (!stockCheck.available)
      return NextResponse.json(
        { message: "Insufficient stock", shortfalls: stockCheck.shortfall },
        { status: 400 },
      );

    const order = new Order({
      orderNumber: generateOrderNumber(),
      user: payload.userId,
      items: items.map((item: any) => ({
        product: item.id,
        quantity: item.quantity,
        weight: item.weight,
        price: item.price,
        discount: item.discount || 0,
        gst: item.gst || 17,
        subtotal: item.price * item.quantity,
      })),
      shippingAddress,
      subtotal,
      gstAmount,
      total,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      screenshot,
    });

    await order.save();

    // Deduct stock
    const stockDeduction = await deductStock(
      items.map((i: any) => ({ productId: i.id, quantity: i.quantity })),
    );
    if (!stockDeduction.success)
      console.error("Stock deduction failed:", stockDeduction.error);

    return NextResponse.json(
      { message: "Order created successfully", order },
      { status: 201 },
    );
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
