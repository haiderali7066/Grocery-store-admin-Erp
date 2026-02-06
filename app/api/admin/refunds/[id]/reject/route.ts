import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RefundRequest } from '@/lib/models';
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
    const { notes } = body;

    const refund = await RefundRequest.findById(params.id);
    if (!refund) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    if (refund.status !== 'pending') {
      return NextResponse.json({ error: 'Refund already processed' }, { status: 400 });
    }

    // Update refund
    refund.status = 'rejected';
    refund.approvedBy = userPayload.userId;
    refund.approvedAt = new Date();
    refund.notes = notes || 'Refund rejected by admin';
    await refund.save();

    return NextResponse.json({
      success: true,
      message: 'Refund rejected',
      refund,
    });
  } catch (error) {
    console.error('[Refund Reject] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject refund' },
      { status: 500 }
    );
  }
}
