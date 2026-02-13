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

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload)
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    // Fetch orders for the user (or all if admin)
    const query = payload.role === "admin" ? {} : { user: payload.userId };
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
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

    // Validate payment method
    const validPaymentMethods = [
      "cod",
      "bank",
      "easypaisa",
      "jazzcash",
      "walkin",
    ];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { message: "Invalid payment method" },
        { status: 400 },
      );
    }

    // Screenshot required for online payments, not for COD
    if (paymentMethod !== "cod" && paymentMethod !== "walkin" && !screenshot) {
      return NextResponse.json(
        { message: "Payment screenshot is required for online payments" },
        { status: 400 },
      );
    }

    // Check stock availability
    const stockCheck = await checkStockAvailability(
      items.map((i: any) => ({ productId: i.id, quantity: i.quantity })),
    );
    if (!stockCheck.available) {
      return NextResponse.json(
        { message: "Insufficient stock for one or more items" },
        { status: 400 },
      );
    }

    // Create order
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
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      orderStatus: paymentMethod === "cod" ? "confirmed" : "pending", // COD orders auto-confirmed
      screenshot: screenshot || null, // Optional for COD
    });

    await order.save();

    // Deduct stock
    await deductStock(
      items.map((i: any) => ({ productId: i.id, quantity: i.quantity })),
    );

    return NextResponse.json(
      {
        message: "Order placed successfully",
        order,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json(
      { message: "Server error. Please try again." },
      { status: 500 },
    );
  }
}
