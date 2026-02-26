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
          (b) => b.status === "active" || b.status === "partial",
        );

        // Format batch details
        // FIX 1: quantity must be the ORIGINAL purchased quantity, not remainingQuantity.
        //        remainingQuantity is sent separately so the frontend can compute sold-per-batch.
        // FIX 2: buyingRate should always be the stored unitCostWithTax (the fully-loaded cost),
        //        not baseRate. baseRate is the pre-tax/freight figure.
        // FIX 3: unitCostWithTax must read b.unitCostWithTax, not b.buyingRate (which is the raw
        //        base rate field on the document, not the computed total cost).
        const batchDetails = batches.map((b) => ({
          _id: b._id,
          quantity: b.quantity,                          // FIX 1: original purchased qty
          remainingQuantity: b.remainingQuantity ?? 0,  // FIX 1: expose remaining separately
          buyingRate: b.buyingRate,                      // FIX 2: base rate before tax/freight
          taxType: b.taxType || "percent",
          taxValue: b.taxValue || 0,
          freightPerUnit: b.freightPerUnit || 0,
          unitCostWithTax: b.unitCostWithTax || 0,      // FIX 3: actual fully-loaded unit cost
          sellingPrice: b.sellingPrice || 0,
          profitPerUnit: b.profitPerUnit || 0,
          status: b.status,
          createdAt: b.createdAt,
        }));

        const formatBatch = (b: (typeof batches)[number]) => ({
          _id: b._id,
          quantity: b.quantity,                          // FIX 1
          remainingQuantity: b.remainingQuantity ?? 0,  // FIX 1
          buyingRate: b.buyingRate,                      // FIX 2
          taxType: b.taxType || "percent",
          taxValue: b.taxValue || 0,
          freightPerUnit: b.freightPerUnit || 0,
          unitCostWithTax: b.unitCostWithTax || 0,      // FIX 3
          sellingPrice: b.sellingPrice || 0,
          profitPerUnit: b.profitPerUnit || 0,
          status: b.status,
          createdAt: b.createdAt,
        });

        return {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          stock: product.stock || 0,          // authoritative live stock — used for Sold calc
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