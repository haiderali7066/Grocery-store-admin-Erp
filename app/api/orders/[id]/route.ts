// FILE PATH: app/api/orders/[id]/route.ts

import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export async function GET(req: NextRequest, context: { params: any }) {
  try {
    await connectDB();

    const { params } = context;
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload)
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    if (!isValidObjectId(orderId))
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });

    const order = await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate(
        "items.product",
        "name retailPrice unitSize unitType discount mainImage images",
      )
      .lean();

    if (!order)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    // Only admin or the order owner can view
    if (
      payload.role !== "admin" &&
      (order.user as any)?._id?.toString() !== payload.userId
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // ── Enrich items so the frontend can distinguish bundle vs regular ────
    // Bundle items share the same bundleId. We group them so the UI can
    // render them under a single "bundle" heading.
    const enrichedItems = (order.items as any[]).map((item) => {
      const product = item.product as any;

      // Resolve image: product.mainImage → product.images[0] → item.image → null
      const image =
        product?.mainImage ||
        product?.images?.[0] ||
        item.image ||
        null;

      return {
        ...item,
        // Ensure these fields are always present so the UI doesn't have to guard
        name:        item.name       || product?.name     || "Product",
        image,
        bundleId:    item.bundleId   || null,
        bundleName:  item.bundleName || null,
        isBundle:    !!item.bundleId,             // true when this line came from a bundle
        subtotal:    item.subtotal   ?? (item.price * item.quantity),
      };
    });

    return NextResponse.json(
      { order: { ...order, items: enrichedItems } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}