import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Refund } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { orderNumber, amount, reason, notes } = body;

    if (!orderNumber || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create manual POS return
    const refund = new Refund({
      orderNumber: orderNumber,
      returnType: "pos_manual",
      requestedAmount: parseFloat(amount),
      deliveryCost: 0, // No delivery cost for POS
      reason: reason || "pos_return",
      notes: notes,
      status: "pending",
    });

    await refund.save();

    return NextResponse.json(
      { success: true, message: "Manual return created", refund },
      { status: 201 },
    );
  } catch (error) {
    console.error("Manual return error:", error);
    return NextResponse.json(
      { error: "Failed to create manual return" },
      { status: 500 },
    );
  }
}
