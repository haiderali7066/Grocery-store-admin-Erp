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
    if (!payload || payload.role !== "admin") {
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
          (b) => b.status === "active" || b.status === "partial"
        );

        // Format batch details
        const batchDetails = batches.map((b) => ({
          _id: b._id,
          quantity: b.remainingQuantity || b.quantity,
          buyingRate: b.baseRate || b.buyingRate,
          taxType: b.taxType || "percent",
          taxValue: b.taxValue || 0,
          freightPerUnit: b.freightPerUnit || 0,
          unitCostWithTax: b.buyingRate,
          sellingPrice: b.sellingPrice || 0,
          profitPerUnit: b.profitPerUnit || 0,
          status: b.status,
          createdAt: b.createdAt,
        }));

        return {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          stock: product.stock || 0,
          batches: batchDetails,
          currentBatch: currentBatch
            ? {
                _id: currentBatch._id,
                quantity: currentBatch.remainingQuantity || currentBatch.quantity,
                buyingRate: currentBatch.baseRate || currentBatch.buyingRate,
                taxType: currentBatch.taxType || "percent",
                taxValue: currentBatch.taxValue || 0,
                freightPerUnit: currentBatch.freightPerUnit || 0,
                unitCostWithTax: currentBatch.buyingRate,
                sellingPrice: currentBatch.sellingPrice || 0,
                profitPerUnit: currentBatch.profitPerUnit || 0,
                status: currentBatch.status,
                createdAt: currentBatch.createdAt,
              }
            : null,
          lowStockThreshold: product.lowStockThreshold || 10,
        };
      })
    );

    return NextResponse.json({ inventory }, { status: 200 });
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}