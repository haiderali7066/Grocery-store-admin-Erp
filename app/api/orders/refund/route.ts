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
        { error: 'Walk-in sales cannot be refunded' },
        { status: 400 }
      );
    }

    // Check order status - cannot refund cancelled orders
    if (order.orderStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'This order is already cancelled' },
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
