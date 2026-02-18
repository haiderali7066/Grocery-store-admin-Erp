// app/api/orders/route.ts
import { connectDB } from "@/lib/db";
import { Order, StoreSettings } from "@/lib/models";
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

    const query = payload.role === "admin" ? {} : { user: payload.userId };
    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .populate("items.product", "name retailPrice unitSize unitType")
      .sort({ createdAt: -1 })
      .lean();

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

    const { items, shippingAddress, paymentMethod, screenshot } =
      await req.json();

    // Load store settings for server-side validation
    const settings = (await StoreSettings.findOne().lean()) as any;

    // Validate payment method
    const knownMethods = ["cod", "bank", "easypaisa", "jazzcash", "walkin"];
    if (!knownMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { message: "Invalid payment method" },
        { status: 400 },
      );
    }

    if (paymentMethod !== "walkin" && settings?.paymentMethods) {
      const methodConfig = settings.paymentMethods[paymentMethod];
      if (!methodConfig?.enabled) {
        return NextResponse.json(
          { message: `Payment method "${paymentMethod}" is not available.` },
          { status: 400 },
        );
      }
    }

    if (paymentMethod !== "cod" && paymentMethod !== "walkin" && !screenshot) {
      return NextResponse.json(
        { message: "Payment screenshot is required for online payments" },
        { status: 400 },
      );
    }

    // Server-side tax recalculation
    const storeTaxEnabled: boolean = settings?.taxEnabled ?? true;
    const storeTaxRate: number = settings?.taxRate ?? 17;
    const storeShippingCost: number = settings?.shippingCost ?? 0;
    const storeFreeShippingThreshold: number =
      settings?.freeShippingThreshold ?? 0;

    const serverSubtotal: number = items.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0,
    );

    const serverTaxAmount: number = storeTaxEnabled
      ? items.reduce((sum: number, i: any) => {
          const rate = i.gst != null ? i.gst : storeTaxRate;
          return sum + (i.price * i.quantity * rate) / 100;
        }, 0)
      : 0;

    const serverShipping: number =
      storeFreeShippingThreshold > 0 &&
      serverSubtotal >= storeFreeShippingThreshold
        ? 0
        : storeShippingCost;

    const serverTotal: number =
      serverSubtotal + serverTaxAmount + serverShipping;

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

    // Create order with proper COD status initialization
    const orderData: any = {
      orderNumber: generateOrderNumber(),
      user: payload.userId,
      items: items.map((item: any) => ({
        product: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      })),
      shippingAddress,
      subtotal: serverSubtotal,
      gstAmount: serverTaxAmount,
      shippingCost: serverShipping,
      discount: 0,
      total: serverTotal,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: paymentMethod === "cod" ? "pending" : "pending",
      screenshot: screenshot || null,
    };

    // Initialize COD payment status for COD orders
    if (paymentMethod === "cod") {
      orderData.codPaymentStatus = "unpaid";
    }

    const order = new Order(orderData);
    await order.save();

    // Deduct stock after order creation
    await deductStock(
      items.map((i: any) => ({ productId: i.id, quantity: i.quantity })),
    );

    return NextResponse.json(
      { message: "Order placed successfully", order },
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
