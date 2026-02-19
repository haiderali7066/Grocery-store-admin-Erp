import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models";
import { getServerSession } from "next-auth"; // or your auth method

export async function POST(request: Request) {
  try {
    await connectDB();

    // get logged-in user session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to submit a review" },
        { status: 401 },
      );
    }

    const { productId, rating, comment, orderId } = await request.json();

    if (!productId || !rating || !comment || !orderId) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: session.user.id,
      product: productId,
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this product" },
        { status: 400 },
      );
    }

    // Create review
    const newReview = await Review.create({
      product: productId,
      user: session.user.id,
      order: orderId,
      rating,
      comment,
      isApproved: false, // admin approval required
    });

    return NextResponse.json(
      { message: "Review submitted successfully!", review: newReview },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("Error creating review:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
