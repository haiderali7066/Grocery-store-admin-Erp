import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RefundRequest, Order, InventoryBatch, Product } from '@/lib/models';
import { verifyAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authToken = request.cookies.get('token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPayload = verifyAuth(authToken);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { approvalAmount, notes } = body;

    const refund = await RefundRequest.findById(params.id).populate('order');
    if (!refund) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    if (refund.status !== 'pending') {
      return NextResponse.json({ error: 'Refund already processed' }, { status: 400 });
    }

    const order = refund.order as any;

    // Process refund: adjust inventory (add back items)
    for (const item of order.items) {
      if (!item.product) continue;

      const product = await Product.findById(item.product);
      if (!product) continue;

      // Create inventory batch for returned items
      const batch = new InventoryBatch({
        product: product._id,
        quantity: item.quantity,
        buyingRate: item.price / item.quantity, // Approximate cost
        expiry: null,
        status: 'active',
      });
      await batch.save();

      // Increase product stock
      product.stock += item.quantity;
      await product.save();
    }

    // Update refund
    refund.status = 'approved';
    refund.approvedBy = userPayload.userId;
    refund.approvedAt = new Date();
    refund.refundedAmount = approvalAmount;
    refund.notes = notes;
    await refund.save();

    // Update order status
    order.orderStatus = 'cancelled';
    await order.save();

    return NextResponse.json({
      success: true,
      message: 'Refund approved',
      refund,
    });
  } catch (error) {
    console.error('[Refund Approve] Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve refund' },
      { status: 500 }
    );
  }
}
