// app/api/admin/customers/[id]/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order, POSSale } from "@/lib/models";
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

    // Fetch online orders
    const onlineOrders = await Order.find({ user: id })
      .populate("items.product", "name mainImage")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch POS sales
    const posSales = await POSSale.find({ customer: id })
      .sort({ createdAt: -1 })
      .lean();

    // Format online orders
    const formattedOnlineOrders = (onlineOrders as any[]).map((o) => ({
      _id: o._id.toString(),
      orderNumber: o.orderNumber,
      type: "online",
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

    // Format POS sales
    const formattedPosSales = (posSales as any[]).map((s) => ({
      _id: s._id.toString(),
      orderNumber: s.saleNumber,
      type: "pos",
      total: s.total || s.totalAmount,
      orderStatus: "completed",
      paymentStatus: s.paymentStatus || "completed",
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt,
      items: (s.items || []).map((i: any) => ({
        name: i.name || "Item",
        quantity: i.quantity,
        price: i.price,
      })),
    }));

    // Combine and sort by date
    const allOrders = [...formattedOnlineOrders, ...formattedPosSales].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({ orders: allOrders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
