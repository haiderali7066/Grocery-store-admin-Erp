// app/api/admin/customers/[id]/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orders = await Order.find({ user: id })
      .populate("items.product", "name mainImage")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = (orders as any[]).map((o) => ({
      _id: o._id.toString(),
      orderNumber: o.orderNumber,
      total: o.total,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      items: (o.items || []).map((i: any) => ({
        name: i.product?.name || "Product",
        quantity: i.quantity,
        price: i.price,
      })),
    }));

    return NextResponse.json({ orders: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
