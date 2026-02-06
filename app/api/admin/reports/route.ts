import { connectDB } from '@/lib/db';
import { Order, Product, InventoryBatch } from '@/lib/models/index';
import { getInventoryValuation } from '@/lib/inventory';
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

    // Get all orders
    const orders = await Order.find().populate('items.product');

    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalProfit = orders.reduce((sum, order) => sum + (order.profit || 0), 0);

    // Calculate COGS (Cost of Goods Sold)
    const totalCost = orders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum: number, item: any) => {
          const costPerUnit = (item.price * 100) / (100 + (item.gst || 17));
          return itemSum + costPerUnit * item.quantity;
        }, 0)
      );
    }, 0);

    // Get product-wise profit
    const products = await Product.find();
    const productSales = products.slice(0, 5).map((product) => {
      const productOrders = orders.filter((order) =>
        order.items.some(
          (item: any) => item.product._id.toString() === product._id.toString()
        )
      );

      const sales = productOrders.reduce((sum, order) => {
        const productItems = order.items.filter(
          (item: any) => item.product._id.toString() === product._id.toString()
        );
        return sum + productItems.reduce((s: number, item: any) => s + item.subtotal, 0);
      }, 0);

      const profit =
        sales > 0 ? (sales * totalProfit) / totalSales : 0;

      return {
        name: product.name,
        sales,
        profit,
      };
    });

    // Calculate tax data
    const taxableItems = orders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((s: number, item: any) => {
          if (item.gst > 0) return s + item.quantity;
          return s;
        }, 0)
      );
    }, 0);

    const taxAmount = orders.reduce((sum, order) => sum + order.gstAmount, 0);

    // Inventory valuation
    const inventoryValuation = await getInventoryValuation();

    return NextResponse.json(
      {
        report: {
          totalSales,
          totalCost,
          totalProfit,
          productSales,
          taxData: {
            taxableAmount: totalSales,
            taxAmount,
            exemptAmount: 0,
          },
          inventoryValuation: inventoryValuation.totalValue,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reports generation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
