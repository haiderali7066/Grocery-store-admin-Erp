// FILE PATH: app/api/refunds/request/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// FIX: Save returnItems when creating the refund so the approve route has
//      productId + unitPrice + costPrice to work with.
//      Previously this route saved NO returnItems at all, making costPrice
//      always 0 in the DB regardless of all fixes downstream.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Refund, Order, InventoryBatch } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// ── Build productId → FIFO cost map ──────────────────────────────────────────
async function buildProductCostMap(): Promise<Map<string, number>> {
  const allBatches = await InventoryBatch.find(
    {},
    { product: 1, buyingRate: 1, remainingQuantity: 1, status: 1, createdAt: 1 }
  ).sort({ createdAt: 1 }).lean() as any[];

  const productCostMap   = new Map<string, number>();
  const batchesByProduct = new Map<string, any[]>();

  for (const b of allBatches) {
    const id = b.product?.toString();
    if (!id) continue;
    if (!batchesByProduct.has(id)) batchesByProduct.set(id, []);
    batchesByProduct.get(id)!.push(b);
  }

  for (const [id, batches] of batchesByProduct) {
    const current =
      batches.find(
        b => (b.remainingQuantity ?? 0) > 0 &&
             (b.status === "active" || b.status === "partial")
      ) ?? batches[batches.length - 1];
    productCostMap.set(id, current?.buyingRate ?? 0);
  }

  return productCostMap;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { orderId, reason } = body;

    if (!orderId || !reason)
      return NextResponse.json(
        { error: "Order ID and reason are required" },
        { status: 400 }
      );

    // ── Populate items.product so we get productId, name, price ──────────
    const order = await Order.findById(orderId)
      .populate("items.product", "name")
      .lean() as any;

    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (
      order.user.toString() !== payload.userId &&
      payload.role !== "admin"
    )
      return NextResponse.json(
        { error: "You can only request refunds for your own orders" },
        { status: 403 }
      );

    if (order.isPOS)
      return NextResponse.json(
        { error: "Walk-in/POS sales cannot be refunded online. Please visit the store." },
        { status: 400 }
      );

    if (!["delivered", "shipped"].includes(order.orderStatus))
      return NextResponse.json(
        { error: `Cannot request refund for orders with status: ${order.orderStatus}` },
        { status: 400 }
      );

    const existingRefund = await Refund.findOne({
      order: orderId,
      status: { $in: ["pending", "approved", "completed"] },
    });

    if (existingRefund)
      return NextResponse.json(
        { error: "This order already has a pending or approved refund request" },
        { status: 400 }
      );

    // ── Build cost map so costPrice is captured at request time ───────────
    const costMap = await buildProductCostMap();

    // ── Build returnItems from order items ────────────────────────────────
    const returnItems = (order.items || []).map((item: any) => {
      const product   = item.product as any;
      const productId = product?._id || item.productId || null;
      const pid       = productId?.toString();
      const costPrice = pid ? (costMap.get(pid) ?? 0) : 0;
      const unitPrice = item.price || 0;

      return {
        productId,
        name:          item.name || product?.name || "Unknown Product",
        returnQty:     item.quantity || 1,
        unitPrice,
        costPrice,                        // ← captured from batch map
        profitPerUnit: unitPrice - costPrice,
        lineTotal:     item.subtotal || unitPrice * (item.quantity || 1),
        restock:       true,
      };
    });

    console.log(
      "[Refund Request] Creating with items:",
      returnItems.map((i: any) =>
        `${i.name}×${i.returnQty} sell=${i.unitPrice} cost=${i.costPrice} profit=${i.profitPerUnit}`
      )
    );

    const refund = new Refund({
      order:           orderId,
      returnType:      "online",
      requestedAmount: order.subtotal || order.total,  // items subtotal, not total (excl. shipping)
      deliveryCost:    order.shippingCost || 300,       // actual shipping or fallback Rs 300
      reason,
      status:          "pending",
      returnItems,                                      // ← was missing entirely before
    });

    await refund.save();

    return NextResponse.json(
      {
        success: true,
        message: "Refund request submitted successfully. We will review and respond within 24 hours.",
        refund: {
          _id:             refund._id,
          orderNumber:     order.orderNumber,
          requestedAmount: refund.requestedAmount,
          deliveryCost:    refund.deliveryCost,
          status:          refund.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Refund Request] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit refund request" },
      { status: 500 }
    );
  }
}