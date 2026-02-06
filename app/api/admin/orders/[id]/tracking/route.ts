'use strict';

import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get('cookie') || '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { trackingNumber, trackingProvider, trackingURL, orderStatus } = await req.json();

    const order = await Order.findByIdAndUpdate(
      params.id,
      {
        trackingNumber,
        trackingProvider,
        trackingURL,
        ...(orderStatus && { orderStatus }),
        shippedDate: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error('Tracking update error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
