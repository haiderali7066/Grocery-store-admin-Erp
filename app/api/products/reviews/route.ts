// app/api/products/reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Review, Order } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(request.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || payload.role !== "user") {
      return NextResponse.json(
        { error: "Please log in to leave a review" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { productId, rating, comment } = body;

    if (!productId || !rating || !comment) {
      return NextResponse.json(
        { error: "Product, rating and comment are required" },
        { status: 400 },
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    // Verify user has a DELIVERED order with this product
    const order = await Order.findOne({
      user: payload.userId,
      "items.product": productId,
      orderStatus: "delivered",
    });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "You can only review products from orders that have been delivered",
        },
        { status: 403 },
      );
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: payload.userId,
      product: productId,
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this product" },
        { status: 400 },
      );
    }

    // Create review (pending approval by default)
    const review = await Review.create({
      product: productId,
      user: payload.userId,
      order: order._id,
      rating: parseInt(rating),
      comment: comment.trim(),
      isApproved: false, // Admin must approve
    });

    return NextResponse.json(
      {
        success: true,
        message: "Review submitted! It will appear after admin approval.",
        reviewId: review._id.toString(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit review" },
      { status: 500 },
    );
  }
}
