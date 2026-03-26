// FILE PATH: app/api/admin/refunds/route.ts (ONLINE REFUND POST - FIXED)
// ═══════════════════════════════════════════════════════════════════════════════
// FIX: Ensure returnItems are ALWAYS created with costPrice captured from FIFO batch map
//      This ensures online refunds deduct profit from P&L on approval
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Refund, Order, InventoryBatch } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || !["admin", "manager", "accountant", "staff"].includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const refunds = await Refund.find()
      .populate({ path: "order", select: "orderNumber total items shippingCost paymentMethod" })
      .populate({ path: "approvedBy", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(refunds || [], { status: 200 });
  } catch (error) {
    console.error("[Refunds GET]", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ── Helper: Build productId → FIFO cost map ──────────────────────────────────
async function buildProductCostMap(): Promise<Map<string, number>> {
  const allBatches = await InventoryBatch.find(
    {},
    { product: 1, buyingRate: 1, remainingQuantity: 1, status: 1, createdAt: 1 }
  ).sort({ createdAt: 1 }).lean() as any[];

  const productCostMap = new Map<string, number>();
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
    const payload = auth(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId, reason, deliveryCost } = await req.json();
    if (!orderId || !reason)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // ← Populate items.product so we can get product names
    const order = await Order.findById(orderId).populate("items.product");
    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.user.toString() !== payload.userId && !["admin", "manager", "accountant", "staff"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (order.isPOS)
      return NextResponse.json({ error: "POS sales cannot be refunded online. Please visit store." }, { status: 400 });

    // ── Per-item one-return guard ──────────────────────────────────────────
    const existingRefunds = await Refund.find({
      order: orderId,
      status: { $in: ["pending", "approved", "completed"] },
    }).lean();

    const alreadyReturnedItems = new Set<string>();
    for (const r of existingRefunds) {
      for (const ri of (r as any).returnItems || []) {
        const key = ri.productId?.toString() || ri.name;
        alreadyReturnedItems.add(key);
      }
    }

    const orderItems: any[] = order.items || [];
    const unreturnedItems = orderItems.filter(item => {
      const key = item.product?._id?.toString() || item.productId?.toString() || item.name;
      return !alreadyReturnedItems.has(key);
    });

    if (unreturnedItems.length === 0)
      return NextResponse.json({ error: "All items in this order have already been returned." }, { status: 400 });

    if (existingRefunds.length > 0 && unreturnedItems.length < orderItems.length)
      return NextResponse.json({
        error: `${orderItems.length - unreturnedItems.length} item(s) already returned. Only ${unreturnedItems.length} item(s) remain returnable.`
      }, { status: 400 });

    // ── Build FIFO cost map for accurate cost retrieval ────────────────────
    const productCostMap = await buildProductCostMap();

    const refundableAmount = unreturnedItems.reduce(
      (sum: number, item: any) => sum + (item.subtotal || item.price * item.quantity || 0), 0
    );

    // ← FIX: ALWAYS build returnItems with costPrice from FIFO batch map
    //        This ensures profit deduction happens on approval & in reports P&L
    const returnItems = unreturnedItems.map((item: any) => {
      const productId = item.product?._id?.toString() || item.productId?.toString();
      const costPrice = productId ? (productCostMap.get(productId) ?? 0) : 0;
      const unitPrice = item.price || 0;
      const qty = item.quantity || 0;
      const profitPerUnit = unitPrice - costPrice;

      return {
        productId: item.product?._id || item.productId || null,
        name:      item.product?.name || item.name || "Unknown Item",
        returnQty: qty,
        unitPrice: unitPrice,
        costPrice: costPrice,                  // ← Captured from batch map
        profitPerUnit: profitPerUnit,
        lineTotal: item.subtotal || unitPrice * qty || 0,
        restock:   true,
      };
    });

    console.log(
      "[Online Refund POST] Created with items:",
      returnItems.map(i => `${i.name}×${i.returnQty} cost=${i.costPrice} profit=${i.profitPerUnit}`)
    );

    const refund = new Refund({
      order:            orderId,
      returnType:       "online",
      requestedAmount:  refundableAmount,
      deliveryCost:     parseFloat(deliveryCost) || 0,
      reason,
      returnItems,      // ← Includes costPrice & profitPerUnit
      status: "pending",
    });

    await refund.save();

    return NextResponse.json({ success: true, message: "Refund request created", refund }, { status: 201 });
  } catch (error) {
    console.error("[Refunds POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create refund" }, { status: 500 });
  }
}