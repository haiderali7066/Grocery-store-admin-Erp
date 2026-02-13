// app/api/sale/products/route.ts
// Public: returns all products marked as flash-sale (isNewArrival: true)

import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    const products = await Product.find({
      isNewArrival: true,
      status: "active",
    })
      .select(
        "name retailPrice discount discountType mainImage unitSize unitType stock isNewArrival",
      )
      .sort({ stock: -1, name: 1 })
      .lean();

    return NextResponse.json({ products }, { status: 200 });
  } catch (err) {
    console.error("GET /api/sale/products error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
