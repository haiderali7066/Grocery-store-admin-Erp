import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Refund } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { notes } = body;

    const refund = await Refund.findById(id);
    if (!refund) {
      return NextResponse.json(
        { error: "Refund request not found" },
        { status: 404 }
      );
    }

    if (refund.status !== "pending") {
      return NextResponse.json(
        { error: "Refund already processed" },
        { status: 400 }
      );
    }

    // Update refund record
    refund.status = "rejected";
    refund.approvedBy = payload.userId;
    refund.approvedAt = new Date();
    refund.notes = notes || "Refund rejected by admin";
    await refund.save();

    return NextResponse.json(
      {
        success: true,
        message: "Refund rejected",
        refund,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Refund rejection error:", error);
    return NextResponse.json(
      { error: "Failed to reject refund" },
      { status: 500 }
    );
  }
}