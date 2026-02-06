import { connectDB } from '@/lib/db';
import { Purchase, Supplier, Product } from '@/lib/models/index';
import { addStockFIFO } from '@/lib/inventory';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
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

    const {
      supplier,
      purchaseDate,
      invoiceNumber,
      products,
    } = await req.json();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { message: 'At least one product is required' },
        { status: 400 }
      );
    }

    // Validate all products have buying rate
    for (const product of products) {
      if (!product.buyingRate) {
        return NextResponse.json(
          {
            message: 'Buying rate is mandatory for all products (FIFO requirement)',
          },
          { status: 400 }
        );
      }
    }

    // Create purchase
    let totalAmount = 0;
    const processedProducts = [];

    for (const product of products) {
      const totalCost = product.quantity * product.buyingRate;
      totalAmount += totalCost;

      processedProducts.push({
        product: product.product,
        quantity: product.quantity,
        unit: product.unit || 'kg',
        buyingRate: product.buyingRate,
        totalCost,
        expiry: product.expiry,
      });
    }

    const purchase = new Purchase({
      supplier,
      purchaseDate: new Date(purchaseDate),
      invoiceNumber,
      products: processedProducts,
      totalAmount,
      status: 'completed',
    });

    await purchase.save();

    // Add to inventory using FIFO
    for (const product of products) {
      await addStockFIFO(
        product.product,
        product.quantity,
        product.buyingRate,
        purchase._id.toString(),
        product.expiry ? new Date(product.expiry) : undefined
      );
    }

    // Update supplier balance
    if (supplier) {
      await Supplier.findByIdAndUpdate(supplier, {
        $inc: { balance: totalAmount },
      });
    }

    return NextResponse.json(
      {
        message: 'Purchase created successfully',
        purchase,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Purchase creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const purchases = await Purchase.find()
      .populate('supplier')
      .populate('products.product')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { purchases },
      { status: 200 }
    );
  } catch (error) {
    console.error('Purchases fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
