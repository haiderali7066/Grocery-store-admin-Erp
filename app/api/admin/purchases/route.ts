import { connectDB } from "@/lib/db";
import {
  Purchase,
  Product,
  InventoryBatch,
  Supplier,
} from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { supplier, products } = body;

    if (!supplier || !products || products.length === 0) {
      return NextResponse.json(
        { error: "Supplier and products are required" },
        { status: 400 },
      );
    }

    // Validate supplier exists
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    // Calculate total amount
    let totalAmount = 0;
    const purchaseProducts = [];

    for (const item of products) {
      const { product, quantity, buyingRate } = item;

      if (!product || !quantity || !buyingRate) {
        return NextResponse.json(
          {
            error:
              "Product, quantity, and buying rate are required for all items",
          },
          { status: 400 },
        );
      }

      // Validate product exists
      const productDoc = await Product.findById(product);
      if (!productDoc) {
        return NextResponse.json(
          { error: `Product not found: ${product}` },
          { status: 404 },
        );
      }

      const itemTotal = quantity * buyingRate;
      totalAmount += itemTotal;

      purchaseProducts.push({
        product,
        quantity: parseInt(quantity),
        buyingRate: parseFloat(buyingRate),
        batchNumber: Date.now().toString(),
      });

      // Update product stock
      productDoc.stock += parseInt(quantity);
      await productDoc.save();

      // Create inventory batch for FIFO tracking
      const batch = new InventoryBatch({
        product,
        quantity: parseInt(quantity),
        buyingRate: parseFloat(buyingRate),
        status: "active",
      });
      await batch.save();
    }

    // Create purchase record - FIXED purchaseDate
    const purchase = new Purchase({
      supplier,
      products: purchaseProducts,
      totalAmount,
      purchaseDate: new Date(), // ✅ Use new Date() without parameter
      paymentMethod: "cash",
      paymentStatus: "completed",
      status: "completed",
    });

    await purchase.save();

    return NextResponse.json(
      {
        message: "Purchase created successfully",
        purchase,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Purchase creation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// GET all purchases
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const purchases = await Purchase.find()
      .populate("supplier", "name")
      .populate("products.product", "name sku")
      .sort({ createdAt: -1 });

    return NextResponse.json({ purchases }, { status: 200 });
  } catch (error) {
    console.error("Purchases fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 },
    );
  }
}
