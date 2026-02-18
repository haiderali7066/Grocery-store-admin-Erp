// app/api/admin/reviews/[id]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const review = await Review.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        approvedBy: payload.userId,
        approvedAt: new Date(),
      },
      { new: true },
    );

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Review approved successfully",
      review: {
        _id: review._id.toString(),
        isApproved: review.isApproved,
      },
    });
  } catch (error: any) {
    console.error("Error approving review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve review" },
      { status: 500 },
    );
  }
}
