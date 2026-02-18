import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

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

    // For public store endpoints, check if product should be visible
    // Note: If this is called from admin panel, you may want a separate route
    // or query param to bypass these checks
    if (
      product.status !== "active" ||
      !product.onlineVisible ||
      product.stock <= 0
    ) {
      return NextResponse.json(
        {
          message: "Product not available",
          reason:
            product.status !== "active"
              ? "inactive"
              : !product.onlineVisible
                ? "not_listed_online"
                : "out_of_stock",
        },
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
