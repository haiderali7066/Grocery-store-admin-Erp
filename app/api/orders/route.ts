// FILE PATH: app/api/orders/route.ts
// ✅ ENHANCED: Better error detection for corrupted product IDs

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

    const userId = payload.userId;

    const body = await req.json();
    const {
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

    // ✅ ENHANCED: Pre-validate all product IDs before processing
    console.log("[orders] Validating cart items:", {
      itemCount: items.length,
      itemNames: items.map((i: any) => i.name),
    });

    for (const item of items) {
      // Regular product
      if (!item.isBundle) {
        const productId = item.product || item.id;

        console.log("[orders] Validating regular product:", {
          itemName: item.name,
          productId: productId,
          productIdType: typeof productId,
          isValid: mongoose.Types.ObjectId.isValid(productId),
        });

        if (!productId) {
          return NextResponse.json(
            {
              message: `Item "${item.name || "unknown"}" has no product ID. This is a corrupted cart item. Please clear your cart and add items again.`,
              code: "MISSING_PRODUCT_ID",
            },
            { status: 400 }
          );
        }

        // ✅ Check if ID looks valid
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return NextResponse.json(
            {
              message: `Item "${item.name}" has an invalid product ID: "${productId}". This is a corrupted cart item. Please clear your cart and refresh the page.`,
              code: "INVALID_PRODUCT_ID",
              details: {
                itemName: item.name,
                invalidId: productId,
                idLength: productId.length,
              },
            },
            { status: 400 }
          );
        }
      } else if (item.isBundle && item.bundleProducts) {
        // Bundle products
        for (const bp of item.bundleProducts) {
          const productId = bp.productId || bp.product;

          console.log("[orders] Validating bundle product:", {
            bundleName: item.name,
            productName: bp.name,
            productId: productId,
            isValid: mongoose.Types.ObjectId.isValid(productId),
          });

          if (!productId) {
            return NextResponse.json(
              {
                message: `Bundle "${item.name}" contains a product with no ID. Please remove the bundle from your cart, refresh the page, and add it again.`,
                code: "BUNDLE_MISSING_PRODUCT_ID",
              },
              { status: 400 }
            );
          }

          if (!mongoose.Types.ObjectId.isValid(productId)) {
            return NextResponse.json(
              {
                message: `Bundle "${item.name}" contains product "${bp.name}" with invalid ID: "${productId}". Please remove the bundle and add it again.`,
                code: "BUNDLE_INVALID_PRODUCT_ID",
                details: {
                  bundleName: item.name,
                  productName: bp.name,
                  invalidId: productId,
                },
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // ── Build validated line items ────────────────────────────────────────
    const validatedItems: any[] = [];
    const stockDeductions: { productId: string; quantity: number }[] = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const isBundleItem =
        item.isBundle === true &&
        Array.isArray(item.bundleProducts) &&
        item.bundleProducts.length > 0;

      if (item.isBundle === true && (!Array.isArray(item.bundleProducts) || item.bundleProducts.length === 0)) {
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
            code: "BUNDLE_MISSING_PRODUCTS",
          },
          { status: 400 },
        );
      }

      if (isBundleItem) {
        // ── BUNDLE ─────────────────────────────────────────────────────────
        const bundleQty = Number(item.quantity) || 1;
        const bundlePaidTotal = (Number(item.price) || 0) * bundleQty;
        const bundleDiscount = Number(item.bundleDiscount) || 0;

        const retailTotalPerBundle = item.bundleProducts.reduce(
          (s: number, bp: any) =>
            s + (Number(bp.retailPrice) || 0) * (Number(bp.quantity) || 1),
          0,
        );

        for (const bp of item.bundleProducts) {
          const rawId: string = bp.productId || bp.product || "";

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
                code: "BUNDLE_PRODUCT_NO_ID",
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
                  `Bundle "${item.name}" contains product "${bp.name}" with invalid ID: "${rawId}". ` +
                  `Please clear your cart, refresh the page, and add the bundle again.`,
                code: "BUNDLE_PRODUCT_INVALID_ID",
                details: {
                  bundleName: item.name,
                  productName: bp.name,
                  invalidId: rawId,
                },
              },
              { status: 400 },
            );
          }

          const lineQty = (Number(bp.quantity) || 1) * bundleQty;

          // ✅ ENHANCED: Better error message when product not found
          const product = await Product.findById(rawId).select("stock name _id");
          if (!product) {
            console.error("[orders] Product not found:", {
              searchedId: rawId,
              bundleName: item.name,
              productName: bp.name,
            });
            return NextResponse.json(
              {
                message:
                  `Product "${bp.name}" (ID: ${rawId}) in bundle "${item.name}" was not found. ` +
                  `It may have been removed or your cart data is corrupted. ` +
                  `Please remove the bundle and add it again.`,
                code: "PRODUCT_NOT_FOUND",
                details: {
                  productId: rawId,
                  productName: bp.name,
                  bundleName: item.name,
                },
              },
              { status: 400 },
            );
          }

          if (product.stock < lineQty) {
            return NextResponse.json(
              {
                message:
                  `Not enough stock for "${product.name}" in bundle "${item.name}". ` +
                  `Available: ${product.stock}, needed: ${lineQty}`,
                code: "INSUFFICIENT_STOCK",
              },
              { status: 400 },
            );
          }

          const itemRetailTotal = (Number(bp.retailPrice) || 0) * (Number(bp.quantity) || 1);
          const itemProportion = retailTotalPerBundle > 0
            ? itemRetailTotal / retailTotalPerBundle
            : 0;

          const itemPaidTotal = bundlePaidTotal * itemProportion;
          const unitPrice = parseFloat(
            (lineQty > 0 ? itemPaidTotal / lineQty : 0).toFixed(2),
          );
          const itemSubtotal = parseFloat((unitPrice * lineQty).toFixed(2));

          validatedItems.push({
            product: rawId,
            name: bp.name || product.name,
            quantity: lineQty,
            price: unitPrice,
            image: bp.image || null,
            weight: null,
            discount: 0,
            gst: 0,
            subtotal: itemSubtotal,
            bundleId: item.bundleId || item.id,
            bundleName: item.name,
          });

          calculatedSubtotal += itemSubtotal;
          stockDeductions.push({ productId: rawId, quantity: lineQty });
        }
      } else {
        // ── REGULAR PRODUCT ───────────────────────────────────────────────
        const productId = item.product || item.id;

        if (!productId) {
          return NextResponse.json(
            {
              message: `Item "${item.name || "unknown"}" is missing a product ID. This is a corrupted cart item.`,
              code: "MISSING_PRODUCT_ID",
            },
            { status: 400 },
          );
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return NextResponse.json(
            {
              message:
                `"${item.name}" has an invalid product ID: "${productId}". ` +
                `Please clear your cart, refresh the page, and add items again.`,
              code: "INVALID_PRODUCT_ID",
              details: {
                itemName: item.name,
                invalidId: productId,
              },
            },
            { status: 400 },
          );
        }

        // ✅ ENHANCED: Better error message with debugging info
        const product = await Product.findById(productId).select("stock name _id");
        if (!product) {
          console.error("[orders] Regular product not found:", {
            searchedId: productId,
            itemName: item.name,
          });
          return NextResponse.json(
            {
              message:
                `Product "${item.name}" (ID: ${productId}) was not found in the store. ` +
                `It may have been removed. Please remove it from your cart and refresh.`,
              code: "PRODUCT_NOT_FOUND",
              details: {
                productId: productId,
                productName: item.name,
              },
            },
            { status: 400 },
          );
        }

        if (product.stock < item.quantity) {
          return NextResponse.json(
            {
              message:
                `Not enough stock for "${product.name}". ` +
                `Available: ${product.stock}, requested: ${item.quantity}`,
              code: "INSUFFICIENT_STOCK",
            },
            { status: 400 },
          );
        }

        const itemSubtotal = parseFloat((Number(item.price) * Number(item.quantity)).toFixed(2));

        validatedItems.push({
          product: productId,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          image: item.image || null,
          weight: item.weight || null,
          discount: Number(item.discount) || 0,
          gst: Number(item.gst) || 0,
          subtotal: itemSubtotal,
        });

        calculatedSubtotal += itemSubtotal;
        stockDeductions.push({ productId, quantity: item.quantity });
      }
    }

    // ✅ Validate subtotal
    const calculatedSubtotalRounded = parseFloat(calculatedSubtotal.toFixed(2));
    const sentSubtotal = parseFloat(subtotal) || 0;
    const variance = Math.abs(calculatedSubtotalRounded - sentSubtotal) / (sentSubtotal || 1);

    if (variance > 0.01) {
      console.warn("[orders] Subtotal mismatch:", {
        calculated: calculatedSubtotalRounded,
        sent: sentSubtotal,
        variance: (variance * 100).toFixed(2) + "%",
      });
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
      subtotal: calculatedSubtotalRounded,
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