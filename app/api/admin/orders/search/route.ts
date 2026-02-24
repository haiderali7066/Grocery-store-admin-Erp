// app/api/admin/orders/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order, POSSale, Refund } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !["admin", "manager", "staff"].includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber")?.trim();
    const includeReturnedKeys = searchParams.get("includeReturnedKeys") === "true";

    if (!orderNumber)
      return NextResponse.json({ error: "orderNumber is required" }, { status: 400 });

    // ── Try POS sale first, then online order ────────────────────────────────
    let order: any = null;

    const posSale = await POSSale.findOne({ saleNumber: orderNumber }).lean();
    if (posSale) {
      order = {
        _id: posSale._id,
        orderNumber: (posSale as any).saleNumber,
        total: (posSale as any).total,
        paymentMethod: (posSale as any).paymentMethod,
        shippingCost: 0,
        createdAt: (posSale as any).createdAt,
        items: ((posSale as any).items || []).map((item: any) => ({
          productId: item.product?.toString() || item.productId?.toString() || null,
          product: item.product,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal ?? item.price * item.quantity,
          // Read the returned flag directly from the saved document
          returned: item.returned ?? false,
          returnedAt: item.returnedAt ?? null,
        })),
      };
    } else {
      const onlineOrder = await Order.findOne({ orderNumber }).lean();
      if (onlineOrder) {
        order = {
          _id: onlineOrder._id,
          orderNumber: (onlineOrder as any).orderNumber,
          total: (onlineOrder as any).total,
          paymentMethod: (onlineOrder as any).paymentMethod,
          shippingCost: (onlineOrder as any).shippingCost || 0,
          createdAt: (onlineOrder as any).createdAt,
          items: ((onlineOrder as any).items || []).map((item: any) => ({
            productId: item.product?.toString() || item.productId?.toString() || null,
            product: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal ?? item.price * item.quantity,
            returned: item.returned ?? false,
            returnedAt: item.returnedAt ?? null,
          })),
        };
      }
    }

    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // ── Build returnedItemKeys FRESH from Refund collection ──────────────────
    // CRITICAL: query by `orderNumber` field — exactly how manual/route.ts saves it.
    // We also check the item-level `returned` flag as a belt-and-suspenders fallback.
    const returnedSet = new Set<string>();

    if (includeReturnedKeys) {
      const pastRefunds = await Refund.find({
        orderNumber,
        status: { $in: ["completed", "approved"] },
      }).lean();

      for (const refund of pastRefunds) {
        for (const ri of (refund as any).returnItems || []) {
          const key = ri.productId?.toString() || ri.name;
          if (key) returnedSet.add(key);
        }
      }

      // Belt-and-suspenders: also read item-level `returned` flag if it was saved
      for (const item of order.items) {
        if (item.returned) {
          const key = item.productId?.toString() || item.product?.toString() || item.name;
          if (key) returnedSet.add(key);
        }
      }
    }

    return NextResponse.json(
      { order, returnedItemKeys: Array.from(returnedSet) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Orders Search GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search order" },
      { status: 500 }
    );
  }
}