import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

    // Fetch all POS orders (isPOS flag)
    const orders = await Order.find({ isPOS: true })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name sku retailPrice')
      .lean();

    // Transform orders to include item details
    const formattedOrders = orders.map((order: any) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      subtotal: order.subtotal || 0,
      gstAmount: order.gstAmount || 0,
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'cash',
      createdAt: order.createdAt,
      items: order.items.map((item: any) => ({
        name: item.product?.name || 'Unknown Item',
        sku: item.product?.sku,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal || item.quantity * item.price,
      })),
    }));

    return NextResponse.json(
      { orders: formattedOrders },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POS orders fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
