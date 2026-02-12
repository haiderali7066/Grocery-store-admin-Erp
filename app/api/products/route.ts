import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const isFeatured = searchParams.get("isFeatured");
    const isHot = searchParams.get("isHot");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const limit = parseInt(searchParams.get("limit") || "50"); // Increased limit
    const skip = parseInt(searchParams.get("skip") || "0");

    // Build Filter Object
    const filter: any = { status: "active", onlineVisible: true };

    if (isFeatured === "true") filter.isFeatured = true;
    if (isHot === "true") filter.isHot = true;

    // Category Filter
    if (category && category !== "all") {
      filter.category = category;
    }

    // Search Filter (Case insensitive regex)
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    // Price Filter
    if (minPrice || maxPrice) {
      filter.retailPrice = {};
      if (minPrice) filter.retailPrice.$gte = parseInt(minPrice);
      if (maxPrice) filter.retailPrice.$lte = parseInt(maxPrice);
    }

    const products = await Product.find(filter)
      .limit(limit)
      .skip(skip)
      .populate("category") // This returns the object, handled in frontend interface
      .sort({ createdAt: -1 }); // Show newest first

    const total = await Product.countDocuments(filter);

    return NextResponse.json(
      {
        products,
        total,
        page: Math.floor(skip / limit) + 1,
        pages: Math.ceil(total / limit),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Products API] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
