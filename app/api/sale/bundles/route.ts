// FILE PATH: app/api/sale/bundles/route.ts
// Public endpoint — no auth needed
// Returns active bundles with populated product data for the storefront

import { connectDB } from "@/lib/db";
import { Bundle } from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    const bundles = await Bundle.find({ isActive: true })
      .populate(
        "products.product",
        "_id name retailPrice mainImage unitSize unitType stock"
        // ✅ _id is always included but listing it explicitly makes intent clear
      )
      .sort({ createdAt: -1 })
      .lean();

    // Filter out bundles where any product failed to populate (was deleted)
    const safeBundles = bundles
      .map((bundle: any) => ({
        ...bundle,
        products: bundle.products.filter((bp: any) => {
          const ok =
            bp.product &&
            typeof bp.product === "object" &&
            bp.product._id; // populated objects have _id; unpopulated would be an ObjectId

          if (!ok) {
            console.warn(
              `[/api/sale/bundles] Bundle "${bundle.name}" has missing/deleted product, skipping entry`
            );
          }
          return ok;
        }),
      }))
      // Optionally remove the whole bundle if it ends up with 0 products
      .filter((b: any) => b.products.length > 0);

    return NextResponse.json({ bundles: safeBundles }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/sale/bundles] Error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}