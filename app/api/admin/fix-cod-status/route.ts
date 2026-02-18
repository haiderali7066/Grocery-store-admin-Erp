import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Update all COD orders without codPaymentStatus
    const result = await Order.updateMany(
      {
        paymentMethod: "cod",
        $or: [
          { codPaymentStatus: { $exists: false } },
          { codPaymentStatus: null },
        ],
      },
      {
        $set: { codPaymentStatus: "unpaid" },
      },
    );

    return NextResponse.json(
      {
        message: "COD orders updated successfully",
        modifiedCount: result.modifiedCount,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Fix COD status error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
