// app/api/admin/customers/[id]/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order, POSSale, User } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid customer ID" },
        { status: 400 },
      );
    }

    const objectId = new mongoose.Types.ObjectId(id);

    // Get customer name for name-based fallback (legacy sales without customer field)
    const customer = (await User.findById(objectId)
      .select("name")
      .lean()) as any;

    // Fetch online orders
    const onlineOrders = await Order.find({ user: objectId })
      .populate("items.product", "name mainImage")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch POS sales — ObjectId match + name fallback for pre-linking sales
    const posQuery: any[] = [{ customer: objectId }];
    if (customer?.name) {
      posQuery.push({ customer: null, customerName: customer.name });
    }

    const posSales = await POSSale.find({ $or: posQuery })
      .sort({ createdAt: -1 })
      .lean();

    // Format online orders
    const formattedOnlineOrders = (onlineOrders as any[]).map((o) => ({
      _id: o._id.toString(),
      orderNumber: o.orderNumber,
      type: "online" as const,
      total: o.total ?? 0,
      subtotal: o.subtotal ?? 0,
      tax: o.gstAmount ?? 0,
      discount: o.discount ?? 0,
      shippingCost: o.shippingCost ?? 0,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      items: (o.items || []).map((i: any) => ({
        name: i.product?.name || "Product",
        quantity: i.quantity,
        price: i.price,
        subtotal: i.subtotal ?? i.price * i.quantity,
      })),
    }));

    // Format POS sales
    const formattedPosSales = (posSales as any[]).map((s) => ({
      _id: s._id.toString(),
      orderNumber: s.saleNumber,
      type: "pos" as const,
      total: s.total ?? s.totalAmount ?? 0,
      subtotal: s.subtotal ?? 0,
      tax: s.tax ?? s.gstAmount ?? 0,
      discount: s.discount ?? 0,
      amountPaid: s.amountPaid ?? 0,
      change: s.change ?? 0,
      orderStatus: "completed",
      paymentStatus: s.paymentStatus ?? "completed",
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt,
      items: (s.items || []).map((i: any) => ({
        name: i.name || "Item",
        quantity: i.quantity,
        price: i.price,
        taxRate: i.taxRate ?? 0,
        taxAmount: i.taxAmount ?? 0,
        subtotal: i.total ?? i.price * i.quantity,
      })),
    }));

    const allOrders = [...formattedOnlineOrders, ...formattedPosSales].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const stats = {
      totalOrders: allOrders.length,
      onlineCount: formattedOnlineOrders.length,
      posCount: formattedPosSales.length,
      totalSpent: allOrders.reduce((s, o) => s + o.total, 0),
      totalOnlineSpent: formattedOnlineOrders.reduce((s, o) => s + o.total, 0),
      totalPosSpent: formattedPosSales.reduce((s, o) => s + o.total, 0),
    };

    return NextResponse.json({ orders: allOrders, stats });
  } catch (error: any) {
    console.error("Customer orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
