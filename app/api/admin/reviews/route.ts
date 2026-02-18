// app/api/admin/reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviews = await Review.find()
      .populate("product", "name")
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = reviews.map((r: any) => ({
      _id: r._id.toString(),
      productId: r.product?._id?.toString(),
      productName: r.product?.name || "Unknown Product",
      userId: r.user?._id?.toString(),
      userName: r.user?.name || "Anonymous",
      userEmail: r.user?.email,
      rating: r.rating,
      comment: r.comment,
      isApproved: r.isApproved,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ reviews: formatted });
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
