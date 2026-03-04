// FILE PATH: app/api/pos/products/route.ts

import { connectDB } from "@/lib/db";
import { Product, InventoryBatch } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (
      !payload ||
      !["admin", "manager", "accountant", "staff"].includes(payload.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const products = await Product.find({ status: "active" })
      .populate("category")
      .sort({ createdAt: -1 })
      .lean();

    // ── FIFO Pricing ──────────────────────────────────────────────────────────
    // For each product we return ALL active/partial batches sorted oldest-first.
    // The POS client uses this array to simulate FIFO locally: as units are added
    // to the cart the correct per-batch selling price is applied in real-time
    // without an extra server round-trip.
    //
    // retailPrice is set to the FIRST (current) batch's sellingPrice so the
    // product card always shows the right price.
    // ─────────────────────────────────────────────────────────────────────────
    const productsWithFIFOBatches = await Promise.all(
      products.map(async (product) => {
        const batches = await InventoryBatch.find({
          product: product._id,
          remainingQuantity: { $gt: 0 },
          status: { $in: ["active", "partial"] },
        })
          .sort({ createdAt: 1 }) // Oldest first = FIFO order
          .lean();

        // Shape the batch data the POS client needs
        const fifoBatches = batches.map((b) => ({
          _id: b._id,
          remainingQuantity: b.remainingQuantity,
          sellingPrice: b.sellingPrice,
          buyingRate: b.buyingRate, // landed cost for COGS
        }));

        const currentBatch = fifoBatches[0] ?? null;

        return {
          ...product,
          // Always show the price of the batch currently being consumed
          retailPrice: currentBatch
            ? currentBatch.sellingPrice
            : product.retailPrice,
          costPrice: currentBatch
            ? currentBatch.buyingRate
            : (product as any).lastBuyingRate ?? 0,
          currentBatchId: currentBatch?._id ?? null,
          // Full FIFO queue exposed to the client for local simulation
          fifoBatches,
        };
      })
    );

    return NextResponse.json(
      { products: productsWithFIFOBatches },
      { status: 200 }
    );
  } catch (error) {
    console.error("POS Products GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch POS products" },
      { status: 500 }
    );
  }
}