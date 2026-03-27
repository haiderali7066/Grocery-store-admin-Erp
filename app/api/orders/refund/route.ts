// FILE PATH: app/api/refunds/route.ts  (or wherever this creation route lives)
// ═══════════════════════════════════════════════════════════════════════════════
// FIX: Populate returnItems from order.items when creating the refund request
//      so the approve route has productId + unitPrice to work with.
//      costPrice is intentionally left at 0 here — the approve route fills it
//      in from the live inventory batch map at approval time.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, RefundRequest } from '@/lib/models';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPayload = verifyAuth(authToken);

    await connectDB();

    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: 'Order ID and reason are required' },
        { status: 400 }
      );
    }

    // Populate items.product so we can capture productId, name, price
    const order = await Order.findById(orderId)
      .populate('items.product', 'name')
      .lean() as any;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user.toString() !== userPayload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (order.isPOS) {
      return NextResponse.json(
        { error: 'Walk-in sales cannot be refunded' },
        { status: 400 }
      );
    }

    if (order.orderStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'This order is already cancelled' },
        { status: 400 }
      );
    }

    const existingRefund = await RefundRequest.findOne({
      order: orderId,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingRefund) {
      return NextResponse.json(
        { error: 'This order already has a pending or approved refund request' },
        { status: 400 }
      );
    }

    // ── FIX: Build returnItems from order items ────────────────────────────
    // costPrice is left 0 here — the approve route resolves it from the
    // inventory batch map at approval time using the productId below.
    const returnItems = (order.items || []).map((item: any) => {
      const product   = item.product as any;
      // product is populated so product._id is the ObjectId, product.name is the string
      const productId = product?._id || item.productId || null;
      const name      = item.name || product?.name || 'Unknown Product';
      const unitPrice = item.price || 0;
      const returnQty = item.quantity || 1;

      return {
        productId,                        // ← ObjectId stored — approve route resolves cost from this
        name,
        returnQty,
        unitPrice,
        costPrice:     0,                 // ← filled in correctly at approval time
        profitPerUnit: 0,                 // ← filled in correctly at approval time
        lineTotal:     unitPrice * returnQty,
        restock:       true,
      };
    });

    // Create refund request with returnItems populated
    const refund = new RefundRequest({
      order:           orderId,
      requestedAmount: order.total,
      reason,
      status:          'pending',
      returnItems,                        // ← was missing entirely before
    });

    await refund.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Refund request submitted. We will review and respond within 24 hours.',
        refund,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Refund Request] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit refund request' },
      { status: 500 }
    );
  }
}