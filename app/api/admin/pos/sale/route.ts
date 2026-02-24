// app/api/admin/pos/sales/route.ts
// Unified route: merges POSSale collection + Order{isPOS:true} into one list.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { POSSale, Order } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !["admin", "manager", "staff"].includes(payload.role)) return null;
  return payload;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ── Fetch from both models in parallel ───────────────────────────────────
    const [rawSales, rawOrders] = await Promise.all([
      POSSale.find({})
        .populate("cashier", "name")
        .sort({ createdAt: -1 })
        .lean(),
      Order.find({ isPOS: true })
        .sort({ createdAt: -1 })
        .populate("items.product", "name sku retailPrice")
        .lean(),
    ]);

    // ── Normalise POSSale records ─────────────────────────────────────────────
    const fromPOSSale = (rawSales as any[]).map((sale) => ({
      _id: sale._id,
      source: "POSSale" as const,
      orderNumber: sale.saleNumber || sale.orderNumber || "N/A",
      cashierName: sale.cashier?.name || "Deleted User",
      subtotal: sale.subtotal || 0,
      gstAmount: sale.gstAmount || 0,
      total: sale.totalAmount || sale.total || 0,
      paymentMethod: sale.paymentMethod || "cash",
      createdAt: sale.createdAt,
      items: (sale.items || []).map((item: any) => ({
        productId: item.product?.toString() || item.productId?.toString() || null,
        name: item.name || "Item",
        quantity: item.quantity || 0,
        price: item.price || 0,
        subtotal: item.subtotal ?? (item.price || 0) * (item.quantity || 0),
        returned: item.returned ?? false,
        returnedAt: item.returnedAt ?? null,
      })),
    }));

    // ── Normalise Order{isPOS} records ────────────────────────────────────────
    const fromOrders = (rawOrders as any[]).map((order) => ({
      _id: order._id,
      source: "Order" as const,
      orderNumber: order.orderNumber || "N/A",
      cashierName: order.cashierName || "POS",
      subtotal: order.subtotal || 0,
      gstAmount: order.gstAmount || 0,
      total: order.total || 0,
      paymentMethod: order.paymentMethod || "cash",
      createdAt: order.createdAt,
      items: (order.items || []).map((item: any) => ({
        productId: item.product?._id?.toString() || item.productId?.toString() || null,
        name: item.product?.name || item.name || "Unknown Item",
        sku: item.product?.sku,
        quantity: item.quantity || 0,
        price: item.price || 0,
        subtotal: item.subtotal ?? (item.price || 0) * (item.quantity || 0),
        returned: item.returned ?? false,
        returnedAt: item.returnedAt ?? null,
      })),
    }));

    // ── Merge and sort by createdAt desc ──────────────────────────────────────
    const allSales = [...fromPOSSale, ...fromOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ sales: allSales }, { status: 200 });
  } catch (error) {
    console.error("POS sales fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}