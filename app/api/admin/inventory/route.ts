import { connectDB } from "@/lib/db";
import { Product, InventoryBatch } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    // Allow all staff roles to view inventory
    if (!payload || !["admin", "manager", "accountant", "staff"].includes(payload.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Fetch products
    const products = await Product.find();

    // Map products to inventory with FIFO batch details
    const inventory = await Promise.all(
      products.map(async (product) => {
        // Get all batches for this product sorted by creation date (FIFO)
        const batches = await InventoryBatch.find({
          product: product._id,
        }).sort({ createdAt: 1 }); // Oldest first (FIFO)

        // Get the current active batch (first non-finished batch)
        const currentBatch = batches.find(
          (b) => b.status === "active" || b.status === "partial",
        );

        // Format batch details
        const batchDetails = batches.map((b) => ({
          _id: b._id,
          quantity: b.quantity,
          remainingQuantity: b.remainingQuantity ?? 0,
          buyingRate: b.buyingRate,
          taxType: b.taxType || "percent",
          taxValue: b.taxValue || 0,
          freightPerUnit: b.freightPerUnit || 0,
          unitCostWithTax: b.unitCostWithTax || 0,
          sellingPrice: b.sellingPrice || 0,
          profitPerUnit: b.profitPerUnit || 0,
          status: b.status,
          isReturn: b.isReturn || false, // Include isReturn flag for frontend filtering
          createdAt: b.createdAt,
        }));

        const formatBatch = (b: (typeof batches)[number]) => ({
          _id: b._id,
          quantity: b.quantity,
          remainingQuantity: b.remainingQuantity ?? 0,
          buyingRate: b.buyingRate,
          taxType: b.taxType || "percent",
          taxValue: b.taxValue || 0,
          freightPerUnit: b.freightPerUnit || 0,
          unitCostWithTax: b.unitCostWithTax || 0,
          sellingPrice: b.sellingPrice || 0,
          profitPerUnit: b.profitPerUnit || 0,
          status: b.status,
          isReturn: b.isReturn || false,
          createdAt: b.createdAt,
        });

        return {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          stock: product.stock || 0,
          batches: batchDetails,
          currentBatch: currentBatch ? formatBatch(currentBatch) : null,
          lowStockThreshold: product.lowStockThreshold || 10,
        };
      }),
    );

    return NextResponse.json({ inventory }, { status: 200 });
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}