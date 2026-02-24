// app/api/sale/bundles/route.ts
// Public: returns all bundles tagged for flash sale

import { connectDB } from "@/lib/db";
import { Bundle } from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    const bundles = await Bundle.find({ isFlashSale: true, isActive: true })
      .populate("products.product", "name mainImage retailPrice unitSize unitType stock")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ bundles }, { status: 200 });
  } catch (err) {
    console.error("GET /api/sale/bundles error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}