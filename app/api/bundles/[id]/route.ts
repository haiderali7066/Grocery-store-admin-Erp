// app/api/bundles/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose"; // adjust to your db connection path
import Bundle from "@/models/Bundle";        // adjust to your Bundle model path

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const bundle = await Bundle.findById(params.id)
      .populate({
        path: "products.product",
        select: "name retailPrice mainImage unitSize unitType",
      })
      .lean();

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    return NextResponse.json({ bundle });
  } catch (error) {
    console.error("[GET /api/bundles/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}