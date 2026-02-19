// app/api/products/[id]/reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const approvedOnly = searchParams.get("approved") === "true";

    const query: any = { product: id };

    // For public product pages, only show approved reviews
    if (approvedOnly) {
      query.isApproved = true;
    }

    const reviews = await Review.find(query)
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = reviews.map((r: any) => ({
      _id: r._id.toString(),
      userName: r.user?.name || "Anonymous",
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      isApproved: r.isApproved,
    }));

    return NextResponse.json({
      success: true,
      reviews: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Error fetching product reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
