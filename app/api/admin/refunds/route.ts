import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RefundRequest, Order, InventoryBatch, Product } from '@/lib/models';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    const refunds = await RefundRequest.find()
      .populate('order', 'orderNumber total items')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(refunds);
  } catch (error) {
    console.error('[Refunds] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refund requests' },
      { status: 500 }
    );
  }
}

// Create refund request (customer)
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

    // Validate order belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user.toString() !== userPayload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prevent refunds for POS sales
    if (order.isPOS) {
      return NextResponse.json(
        { error: 'POS sales cannot be refunded' },
        { status: 400 }
      );
    }

    // Check if already has pending refund
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

    // Create refund request
    const refund = new RefundRequest({
      order: orderId,
      requestedAmount: order.total,
      reason,
      status: 'pending',
    });

    await refund.save();

    return NextResponse.json(
      { success: true, message: 'Refund request created', refund },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Refunds] Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create refund request' },
      { status: 500 }
    );
  }
}
