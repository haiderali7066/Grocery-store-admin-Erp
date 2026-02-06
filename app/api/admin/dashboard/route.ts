import { connectDB } from '@/lib/db';
import { Order, Product } from '@/lib/models/index';
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
    if (!payload || (payload.role !== 'admin' && payload.role !== 'staff')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Get all orders
    const orders = await Order.find();
    const products = await Product.find();

    // Calculate stats
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const totalProfit = orders.reduce((sum, order) => sum + (order.profit || 0), 0);
    const pendingOrders = orders.filter(
      (o) => o.paymentStatus === 'pending'
    ).length;
    const pendingPayments = orders.filter(
      (o) => o.paymentStatus === 'pending'
    ).length;
    
    // Low stock products with details
    const lowStockProductsList = products
      .filter((p) => p.stock <= (p.lowStockThreshold || 10))
      .map((p) => ({
        name: p.name,
        stock: p.stock,
        threshold: p.lowStockThreshold || 10,
      }));

    // Revenue breakdown
    const posRevenue = orders
      .filter((o) => o.isPOS === true)
      .reduce((sum, order) => sum + order.total, 0);
    const onlineRevenue = orders
      .filter((o) => o.isPOS !== true)
      .reduce((sum, order) => sum + order.total, 0);

    // GST & Tax
    const gstCollected = orders.reduce((sum, order) => sum + (order.gstAmount || 0), 0);
    const gstLiability = gstCollected * 0.17; // Simplified: 17% tax liability

    // Generate monthly data
    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - (11 - i));
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthOrders = orders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      const sales = monthOrders.reduce((sum, order) => sum + order.total, 0);
      const profit = monthOrders.reduce((sum, order) => sum + (order.profit || 0), 0);

      monthlyData.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        sales,
        profit,
      });
    }

    const lowStockProducts = lowStockProductsList; // Declare the variable before using it

    return NextResponse.json(
      {
        stats: {
          totalSales,
          totalOrders,
          totalProfit,
          pendingOrders,
          lowStockProducts: lowStockProductsList,
          monthlyData,
          dailyData: [],
          gstCollected,
          gstLiability,
          posRevenue,
          onlineRevenue,
          pendingPayments,
          fbrStatus: 'active',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
