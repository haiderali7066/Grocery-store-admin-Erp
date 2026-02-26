// FILE PATH: app/api/orders/route.ts
import { connectDB } from "@/lib/db";
import { Order, Product, InventoryBatch } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// Generate sequential order number
async function generateOrderNumber(): Promise<string> {
  const count = await Order.countDocuments();
  return `ORD-${String(count + 1).padStart(5, "0")}`;
}

// Deduct stock using FIFO batches
async function deductStock(productId: string, quantity: number) {
  let remaining = quantity;

  const batches = await InventoryBatch.find({
    product: productId,
    status: { $in: ["active", "partial"] },
  }).sort({ createdAt: 1 });

  for (const batch of batches) {
    if (remaining <= 0) break;

    const deduct = Math.min(remaining, batch.remainingQuantity);
    batch.remainingQuantity -= deduct;
    remaining -= deduct;

    if (batch.remainingQuantity === 0) {
      batch.status = "finished";
    } else {
      batch.status = "partial";
    }

    await batch.save();
  }

  // Update product stock
  await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      userId,
      items,
      shippingAddress,
      subtotal,
      gstAmount,
      taxRate,
      taxName,
      taxEnabled,
      shippingCost,
      total,
      paymentMethod,
      screenshot,
      // ✅ Hybrid COD fields — MUST be captured here or they're lost forever
      codDeliveryCharge,
      codDeliveryScreenshot,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ message: "No items in order" }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ message: "Payment method required" }, { status: 400 });
    }

    // Validate stock availability before creating order
    for (const item of items) {
      const productId = item.product || item.id;
      const product = await Product.findById(productId);
      if (!product) {
        return NextResponse.json(
          { message: `Product not found: ${productId}` },
          { status: 400 },
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { message: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
          { status: 400 },
        );
      }
    }

    const orderNumber = await generateOrderNumber();

    // Build order items
    const orderItems = items.map((item: any) => ({
      product: item.product || item.id,
      quantity: item.quantity,
      weight: item.weight || null,
      price: item.price,
      discount: item.discount || 0,
      gst: item.gst || 0,
      subtotal: item.price * item.quantity,
    }));

    // ✅ Build the full order document — COD fields saved here
    const orderData: any = {
      orderNumber,
      user: userId,
      items: orderItems,
      shippingAddress,
      subtotal: subtotal || 0,
      gstAmount: gstAmount || 0,
      discount: 0,
      shippingCost: shippingCost || 0,
      total: total || 0,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      screenshot: screenshot || null,
    };

    // ✅ Hybrid COD fields — only set when paymentMethod is cod
    if (paymentMethod === "cod") {
      orderData.codPaymentStatus = "unpaid";
      // Save the advance delivery charge amount (0 if pure COD)
      orderData.codDeliveryCharge = codDeliveryCharge || 0;
      // Save the EasyPaisa screenshot URL (null if no advance required)
      orderData.codDeliveryScreenshot = codDeliveryScreenshot || null;
      orderData.codDeliveryPaid = false;
    }

    const order = await Order.create(orderData);

    // Deduct stock for each item (FIFO)
    for (const item of items) {
      const productId = item.product || item.id;
      await deductStock(productId, item.quantity);
    }

    // Populate for response
    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("items.product", "name retailPrice unitSize unitType")
      .lean();

    return NextResponse.json({ order: populatedOrder }, { status: 201 });
  } catch (err: any) {
    console.error("Create order error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Users can only see their own orders
    const filter = payload.role === "admin" ? {} : { user: payload.userId };

    const orders = await Order.find(filter)
      .populate("items.product", "name retailPrice unitSize unitType mainImage")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err: any) {
    console.error("Fetch orders error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}