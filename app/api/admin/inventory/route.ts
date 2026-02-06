import { connectDB } from '@/lib/db';
import { Product, InventoryBatch } from '@/lib/models/index';
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

    const products = await Product.find();
    const batches = await InventoryBatch.find({ status: { $ne: 'finished' } })
      .populate('product', 'name');

    const inventory = products.map((product) => {
      const productBatches = batches.filter(
        (b) => b.product._id.toString() === product._id.toString()
      );

      const avgBuyingRate =
        productBatches.length > 0
          ? productBatches.reduce((sum, b) => sum + b.buyingRate, 0) /
            productBatches.length
          : 0;

      return {
        _id: product._id,
        name: product.name,
        stock: product.stock,
        buyingRate: avgBuyingRate,
        quantity: productBatches.reduce((sum, b) => sum + b.quantity, 0),
        lowStockThreshold: product.lowStockThreshold,
      };
    });

    return NextResponse.json(
      { inventory },
      { status: 200 }
    );
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
