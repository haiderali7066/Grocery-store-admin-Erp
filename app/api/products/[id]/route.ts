import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // Type changed to Promise
) {
  try {
    await connectDB();

    // In Next.js 15/16, you MUST await params
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    const product = await Product.findById(id).populate("category");

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("[Product API] Error fetching product:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
