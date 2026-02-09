import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import mongoose from 'mongoose';

// Helper to check valid ObjectId
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export async function GET(req: NextRequest, context: { params: any }) {
  try {
    await connectDB();

    // Await params in App Router
    const { params } = context;
    const resolvedParams = await params; // <- unwrap the promise
    const orderId = resolvedParams.id;

    const token = getTokenFromCookie(req.headers.get('cookie') || '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (!isValidObjectId(orderId)) {
      return NextResponse.json({ message: 'Invalid order ID' }, { status: 400 });
    }

    const order = await Order.findById(orderId)
      .populate('user', 'name email phone')
      .populate('items.product', 'name retailPrice unitSize unitType discount')
      .lean();

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Authorization: allow if admin OR if userId matches order.user
    if (payload.role !== 'admin') {
      const orderUserId = order.user?._id?.toString();
      if (!orderUserId || orderUserId !== payload.userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
