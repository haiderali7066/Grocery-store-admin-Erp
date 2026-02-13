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

    // ── Auth ────────────────────────────────────────────────────────────────
    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload)
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    // ── Parse body ──────────────────────────────────────────────────────────
    const {
      items,
      shippingAddress,
      subtotal,
      gstAmount, // legacy alias from older checkout
      taxAmount, // new field
      taxRate,
      taxName,
      taxEnabled,
      shippingCost: clientShipping,
      total,
      paymentMethod,
      screenshot,
    } = await req.json();

    // ── Load store settings to validate server-side ─────────────────────────
    const settings = (await StoreSettings.findOne().lean()) as any;

    // Validate payment method is actually enabled in settings
    const knownMethods = ["cod", "bank", "easypaisa", "jazzcash", "walkin"];
    if (!knownMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { message: "Invalid payment method" },
        { status: 400 },
      );
    }

    // walkin is an internal POS method — skip settings check
    if (paymentMethod !== "walkin" && settings?.paymentMethods) {
      const methodConfig = settings.paymentMethods[paymentMethod];
      if (!methodConfig?.enabled) {
        return NextResponse.json(
          {
            message: `Payment method "${paymentMethod}" is not currently available. Please choose another.`,
          },
          { status: 400 },
        );
      }
    }

    // Screenshot required for all non-COD, non-walkin methods
    if (paymentMethod !== "cod" && paymentMethod !== "walkin" && !screenshot) {
      return NextResponse.json(
        { message: "Payment screenshot is required for online payments" },
        { status: 400 },
      );
    }

    // ── Recalculate tax server-side from settings ────────────────────────────
    // This prevents clients from sending manipulated totals.
    const storeTaxEnabled: boolean = settings?.taxEnabled ?? true;
    const storeTaxRate: number = settings?.taxRate ?? 17;
    const storeTaxName: string = settings?.taxName || "GST";
    const storeShippingCost: number = settings?.shippingCost ?? 0;
    const storeFreeShippingThreshold: number =
      settings?.freeShippingThreshold ?? 0;

    // Recompute subtotal from items (source of truth)
    const serverSubtotal: number = items.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0,
    );

    const serverTaxAmount: number = storeTaxEnabled
      ? items.reduce((sum: number, i: any) => {
          // Use per-product GST if provided, else store rate
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

    // ── Stock check ─────────────────────────────────────────────────────────
    const stockCheck = await checkStockAvailability(
      items.map((i: any) => ({ productId: i.id, quantity: i.quantity })),
    );
    if (!stockCheck.available) {
      return NextResponse.json(
        { message: "Insufficient stock for one or more items" },
        { status: 400 },
      );
    }

    // ── Create order ────────────────────────────────────────────────────────
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
      subtotal: serverSubtotal,
      gstAmount: serverTaxAmount, // stored as gstAmount in schema
      discount: 0,
      total: serverTotal,
      paymentMethod,
      paymentStatus: "pending",
      // COD orders are auto-confirmed; others wait for payment verification
      orderStatus: paymentMethod === "cod" ? "confirmed" : "pending",
      screenshot: screenshot || null,
    });

    await order.save();

    // ── Deduct stock ────────────────────────────────────────────────────────
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
