import { connectDB } from '@/lib/db';
import { User, Order } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getTokenFromCookie } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get('cookie') || '');
    const payload = verifyAuth(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Get all non-admin users
    const users = await User.find({ role: 'user' }).select('name email phone addresses').lean();

    // Get orders and customer stats
    const orders = await Order.find().lean();

    const customers = users.map((user: any) => {
      const userOrders = orders.filter((o) => o.customer?.toString() === user._id.toString() || o.email === user.email);
      const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.addresses?.[0]?.city || 'N/A',
        totalOrders: userOrders.length,
        totalSpent,
        lastOrderDate: userOrders.length > 0
          ? new Date(Math.max(...userOrders.map((o: any) => new Date(o.createdAt).getTime())))
          : null,
      };
    });

    return NextResponse.json({ customers }, { status: 200 });
  } catch (error) {
    console.error('[Customers] Error:', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
