// FILE PATH: app/api/sale/bundles/route.ts
// ✅ Public endpoint for fetching bundles with fully populated product data
// Used by frontend to add bundles to cart

import { connectDB } from "@/lib/db";
import { Bundle } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // ✅ Populate products with all necessary fields for cart
    const bundles = await Bundle.find({ isActive: true })
      .populate(
        "products.product",
        "name retailPrice mainImage unitSize unitType stock _id"
      )
      .sort({ createdAt: -1 })
      .lean();

    // ✅ Validate that all product data is properly populated
    const validBundles = bundles.filter((bundle) => {
      return bundle.products.every(
        (bp: any) =>
          bp.product &&
          typeof bp.product === "object" &&
          bp.product._id &&
          bp.product.retailPrice
      );
    });

    return NextResponse.json(
      { bundles: validBundles, total: validBundles.length },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/sale/bundles error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}