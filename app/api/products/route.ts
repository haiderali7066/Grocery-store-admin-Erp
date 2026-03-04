// FILE PATH: app/api/products/route.ts

import { connectDB } from "@/lib/db";
import { Product, InventoryBatch } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const isFeatured = searchParams.get("isFeatured");
    const isHot      = searchParams.get("isHot");
    const category   = searchParams.get("category");
    const search     = searchParams.get("search");
    const minPrice   = searchParams.get("minPrice");
    const maxPrice   = searchParams.get("maxPrice");
    const limit      = parseInt(searchParams.get("limit") || "50");
    const skip       = parseInt(searchParams.get("skip")  || "0");

    const filter: any = {
      status:        "active",
      onlineVisible: true,
      stock:         { $gt: 0 },
    };

    if (isFeatured === "true") filter.isFeatured = true;
    if (isHot      === "true") filter.isHot      = true;
    if (category && category !== "all") filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    if (minPrice || maxPrice) {
      filter.retailPrice = {};
      if (minPrice) filter.retailPrice.$gte = parseInt(minPrice);
      if (maxPrice) filter.retailPrice.$lte = parseInt(maxPrice);
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .limit(limit)
        .skip(skip)
        .populate("category")
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(filter),
    ]);

    // ── FIFO Pricing ──────────────────────────────────────────────────────────
    // For every product, return the full FIFO batch queue (oldest active batches
    // with remaining stock). The client uses this array to:
    //   1. Show the correct current price on the product card
    //   2. Simulate batch-crossing in real time as units are added to cart
    //      (same logic as the POS — units from different batches get split into
    //       separate cart lines, each priced at their own batch's sellingPrice)
    // ─────────────────────────────────────────────────────────────────────────
    const productsWithFIFO = await Promise.all(
      products.map(async (product) => {
        const batches = await InventoryBatch.find({
          product:           product._id,
          remainingQuantity: { $gt: 0 },
          status:            { $in: ["active", "partial"] },
        })
          .sort({ createdAt: 1 }) // oldest first = FIFO
          .lean();

        const fifoBatches = batches.map((b) => ({
          _id:               String(b._id),
          remainingQuantity: b.remainingQuantity,
          sellingPrice:      b.sellingPrice,
          buyingRate:        b.buyingRate,
        }));

        const currentBatch = fifoBatches[0] ?? null;

        return {
          ...product,
          // Always show the price of the batch currently being consumed
          retailPrice: currentBatch
            ? currentBatch.sellingPrice
            : product.retailPrice,
          fifoBatches,
        };
      })
    );

    return NextResponse.json(
      {
        products: productsWithFIFO,
        total,
        page:  Math.floor(skip / limit) + 1,
        pages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Products API] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}