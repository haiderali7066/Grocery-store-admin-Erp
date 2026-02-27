// FILE PATH: app/api/orders/route.ts
import { connectDB } from "@/lib/db";
import { Order, Product, InventoryBatch } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

async function generateOrderNumber(): Promise<string> {
  const count = await Order.countDocuments();
  return `ORD-${String(count + 1).padStart(5, "0")}`;
}

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
    batch.status = batch.remainingQuantity === 0 ? "finished" : "partial";
    await batch.save();
  }
  await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } });
}

// ── POST: Create Order ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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
      codDeliveryCharge,
      codDeliveryScreenshot,
    } = body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!items?.length)
      return NextResponse.json({ message: "No items in order" }, { status: 400 });
    if (!paymentMethod)
      return NextResponse.json({ message: "Payment method required" }, { status: 400 });
    if (!userId)
      return NextResponse.json({ message: "User ID required" }, { status: 400 });
    if (!shippingAddress)
      return NextResponse.json({ message: "Shipping address required" }, { status: 400 });

    // ── Build validated line items ────────────────────────────────────────
    const validatedItems: any[] = [];
    const stockDeductions: { productId: string; quantity: number }[] = [];

    for (const item of items) {
      const isBundleItem =
        item.isBundle === true &&
        Array.isArray(item.bundleProducts) &&
        item.bundleProducts.length > 0;

      if (item.isBundle === true && (!Array.isArray(item.bundleProducts) || item.bundleProducts.length === 0)) {
        // ── BUNDLE WITH MISSING PRODUCT DATA ─────────────────────────────
        // This happens when a bundle was added to cart via the old addItem()
        // path (before the fix), which doesn't store bundleProducts.
        // Give the user a clear actionable message.
        console.error("[orders] Bundle item missing bundleProducts:", {
          name: item.name,
          id: item.id,
          bundleId: item.bundleId,
        });
        return NextResponse.json(
          {
            message:
              `The bundle "${item.name}" in your cart is missing product details. ` +
              `Please remove it from your cart, refresh the page, and add it again.`,
          },
          { status: 400 },
        );
      }

      if (isBundleItem) {
        // ── BUNDLE ─────────────────────────────────────────────────────────
        const bundleQty = Number(item.quantity) || 1;
        const bundlePaidTotal = (Number(item.price) || 0) * bundleQty;

        const retailTotalPerBundle = item.bundleProducts.reduce(
          (s: number, bp: any) =>
            s + (Number(bp.price) || 0) * (Number(bp.quantity) || 1),
          0,
        );

        for (const bp of item.bundleProducts) {
          const rawId: string =
            bp.productId ||   // CartProvider stores productId
            bp.product ||     // legacy field name
            "";

          // ── Validate productId ──────────────────────────────────────────
          if (!rawId || rawId.trim() === "") {
            console.error("[orders] Bundle product missing productId:", {
              bundleName: item.name,
              bp,
            });
            return NextResponse.json(
              {
                message:
                  `Bundle "${item.name}" has a product with no ID. ` +
                  `Please remove the bundle from your cart and add it again.`,
              },
              { status: 400 },
            );
          }

          if (!mongoose.Types.ObjectId.isValid(rawId)) {
            console.error("[orders] Bundle product invalid ObjectId:", {
              bundleName: item.name,
              rawId,
              bp,
            });
            return NextResponse.json(
              {
                message:
                  `Bundle "${item.name}" contains an invalid product ID. ` +
                  `Please clear your cart, refresh the page, and add the bundle again.`,
              },
              { status: 400 },
            );
          }

          const lineQty = (Number(bp.quantity) || 1) * bundleQty;

          const product = await Product.findById(rawId).select("stock name");
          if (!product) {
            return NextResponse.json(
              {
                message: `A product in bundle "${item.name}" (ID: ${rawId}) was not found. It may have been removed from the store.`,
              },
              { status: 400 },
            );
          }
          if (product.stock < lineQty) {
            return NextResponse.json(
              {
                message: `Not enough stock for "${product.name}" in bundle "${item.name}". Available: ${product.stock}, needed: ${lineQty}`,
              },
              { status: 400 },
            );
          }

          // Proportional price distribution across bundle products
          const lineRetailTotal =
            (Number(bp.price) || 0) * (Number(bp.quantity) || 1) * bundleQty;
          const lineDiscountedTotal =
            retailTotalPerBundle > 0
              ? (lineRetailTotal / (retailTotalPerBundle * bundleQty)) *
                bundlePaidTotal
              : lineRetailTotal;
          const unitPrice = parseFloat(
            (
              lineQty > 0
                ? lineDiscountedTotal / lineQty
                : Number(bp.price) || 0
            ).toFixed(2),
          );

          validatedItems.push({
            product: rawId,
            name: bp.name || product.name,
            quantity: lineQty,
            price: unitPrice,
            image: bp.image || null,
            weight: null,
            discount: 0,
            gst: 0,
            subtotal: parseFloat((unitPrice * lineQty).toFixed(2)),
            bundleId: item.bundleId || item.id,
            bundleName: item.name,
          });

          stockDeductions.push({ productId: rawId, quantity: lineQty });
        }
      } else {
        // ── REGULAR PRODUCT ───────────────────────────────────────────────
        const productId = item.product || item.id;

        if (!productId) {
          return NextResponse.json(
            {
              message: `Item "${item.name || "unknown"}" is missing a product ID`,
            },
            { status: 400 },
          );
        }

        // ── Guard: if the id looks like a bundle name (not a valid ObjectId),
        //    give a clear "stale cart" message instead of a confusing DB error
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return NextResponse.json(
            {
              message:
                `"${item.name}" has an invalid product ID ("${productId}"). ` +
                `If this is a bundle, please remove it from your cart, refresh the page, and add it again.`,
            },
            { status: 400 },
          );
        }

        const product = await Product.findById(productId).select("stock name");
        if (!product) {
          return NextResponse.json(
            {
              message: `Product not found: "${item.name}". It may have been removed from the store.`,
            },
            { status: 400 },
          );
        }
        if (product.stock < item.quantity) {
          return NextResponse.json(
            {
              message: `Not enough stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`,
            },
            { status: 400 },
          );
        }

        validatedItems.push({
          product: productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image || null,
          weight: item.weight || null,
          discount: item.discount || 0,
          gst: item.gst || 0,
          subtotal: item.price * item.quantity,
        });

        stockDeductions.push({ productId, quantity: item.quantity });
      }
    }

    // ── Create order ──────────────────────────────────────────────────────
    const orderNumber = await generateOrderNumber();

    const orderData: any = {
      orderNumber,
      user: userId,
      items: validatedItems,
      shippingAddress: {
        fullName: shippingAddress.fullName || "",
        email: shippingAddress.email || "",
        phone: shippingAddress.phone || "",
        street: shippingAddress.street || "",
        city: shippingAddress.city || "",
        province: shippingAddress.province || "",
        zipCode: shippingAddress.zipCode || "",
        country: shippingAddress.country || "Pakistan",
      },
      subtotal: parseFloat(subtotal) || 0,
      gstAmount: parseFloat(gstAmount) || 0,
      taxRate: parseFloat(taxRate) || 0,
      taxName: taxName || "",
      taxEnabled: !!taxEnabled,
      discount: 0,
      shippingCost: parseFloat(shippingCost) || 0,
      total: parseFloat(total) || 0,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      screenshot: screenshot || null,
    };

    if (paymentMethod === "cod") {
      orderData.codPaymentStatus = "unpaid";
      orderData.codDeliveryCharge = parseFloat(codDeliveryCharge) || 0;
      orderData.codDeliveryScreenshot = codDeliveryScreenshot || null;
      orderData.codDeliveryPaid = false;
    }

    const order = await Order.create(orderData);

    for (const { productId, quantity } of stockDeductions) {
      await deductStock(productId, quantity);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("items.product", "name retailPrice unitSize unitType mainImage")
      .lean();

    return NextResponse.json(
      { message: "Order created successfully", order: populatedOrder },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("Create order error:", err);
    return NextResponse.json(
      { message: err.message || "Server error" },
      { status: 500 },
    );
  }
}

// ── GET: Fetch Orders ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const filter = payload.role === "admin" ? {} : { user: payload.userId };

    const orders = await Order.find(filter)
      .populate("user", "name email phone")
      .populate(
        "items.product",
        "name retailPrice unitSize unitType mainImage stock",
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err: any) {
    console.error("Fetch orders error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}