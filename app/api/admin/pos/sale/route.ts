import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { POSSale } from "@/lib/models";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get("token")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPayload = verifyAuth(authToken);
    if (!userPayload || userPayload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const rawSales = await POSSale.find({})
      .populate("cashier", "name")
      .sort({ createdAt: -1 })
      .lean();

    const formattedSales = rawSales.map((sale: any) => ({
      _id: sale._id,
      orderNumber: sale.saleNumber || sale.orderNumber || "N/A",
      // CRITICAL FIX: Ensure cashierName is never undefined
      cashierName: sale.cashier?.name || "Deleted User",
      subtotal: sale.subtotal || 0,
      gstAmount: sale.gstAmount || 0,
      total: sale.totalAmount || sale.total || 0,
      paymentMethod: sale.paymentMethod || "cash",
      createdAt: sale.createdAt,
      items: (sale.items || []).map((item: any) => ({
        name: item.name || "Item",
        quantity: item.quantity || 0,
        price: item.price || 0,
        subtotal: item.subtotal || (item.price || 0) * (item.quantity || 0),
      })),
    }));

    return NextResponse.json({ sales: formattedSales }, { status: 200 });
  } catch (error: any) {
    console.error("POS sales fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
