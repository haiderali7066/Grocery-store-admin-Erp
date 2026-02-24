// app/api/admin/refunds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Refund, Order, Product, Wallet, InventoryBatch } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  return verifyToken(token);
}

// ── GET — fetch all refunds ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const refunds = await Refund.find()
      .populate({ path: "order", select: "orderNumber total items" })
      .populate({ path: "approvedBy", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(refunds || [], { status: 200 });
  } catch (error) {
    console.error("[Refunds GET]", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST — customer creates online refund request ─────────────────────────────
// Rules:
//   • Each item in the order can only be returned ONCE
//   • No Transaction record is created — wallet balance is cut silently
//   • Stock is restored for each returned item

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId, reason } = await req.json();
    if (!orderId || !reason)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const order = await Order.findById(orderId);
    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Ownership check (admin can do anything)
    if (order.user.toString() !== payload.userId && payload.role !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (order.isPOS)
      return NextResponse.json({ error: "POS sales cannot be refunded online. Please visit store." }, { status: 400 });

    // ── Per-item one-return guard ─────────────────────────────────────────
    // Find all completed/approved/pending refunds for this order
    const existingRefunds = await Refund.find({
      order: orderId,
      status: { $in: ["pending", "approved", "completed"] },
    }).lean();

    // Collect which item indices (or product IDs) have already been returned
    const alreadyReturnedItems = new Set<string>();
    for (const r of existingRefunds) {
      for (const ri of (r as any).returnItems || []) {
        // Key by productId if available, otherwise by name
        const key = ri.productId?.toString() || ri.name;
        alreadyReturnedItems.add(key);
      }
    }

    // Check if ALL items in the order have already been returned
    const orderItems: any[] = order.items || [];
    const unreturnedItems = orderItems.filter(item => {
      const key = item.product?.toString() || item.productId?.toString() || item.name;
      return !alreadyReturnedItems.has(key);
    });

    if (unreturnedItems.length === 0)
      return NextResponse.json({ error: "All items in this order have already been returned." }, { status: 400 });

    if (existingRefunds.length > 0 && unreturnedItems.length < orderItems.length)
      return NextResponse.json({
        error: `${orderItems.length - unreturnedItems.length} item(s) already returned. Only ${unreturnedItems.length} item(s) remain returnable.`
      }, { status: 400 });

    // Calculate amount for un-returned items only
    const refundableAmount = unreturnedItems.reduce((sum: number, item: any) => sum + (item.subtotal || item.price * item.quantity || 0), 0);

    // Build returnItems list for the new refund
    const returnItems = unreturnedItems.map((item: any) => ({
      productId: item.product || item.productId || null,
      name: item.name,
      returnQty: item.quantity,
      unitPrice: item.price || 0,
      lineTotal: item.subtotal || item.price * item.quantity || 0,
      restock: true,
    }));

    // Create the refund as pending (admin must approve)
    const refund = new Refund({
      order: orderId,
      returnType: "online",
      requestedAmount: refundableAmount,
      deliveryCost: 300,
      reason,
      returnItems,
      status: "pending",
    });

    await refund.save();

    return NextResponse.json({ success: true, message: "Refund request created", refund }, { status: 201 });
  } catch (error) {
    console.error("[Refunds POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create refund" }, { status: 500 });
  }
}