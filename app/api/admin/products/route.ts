import { connectDB } from '@/lib/db';
import { Product, Category } from '@/lib/models/index';
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
      name,
      basePrice,
      category,
      weight,
      weightUnit,
      stock,
    } = await req.json();

    // Get or create category
    let categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) {
      categoryDoc = new Category({ name: category });
      await categoryDoc.save();
    }

    const sku = `${name.substring(0, 3).toUpperCase()}-${Date.now()}`;

    const product = new Product({
      name,
      sku,
      retailPrice: basePrice,
      category: categoryDoc._id,
      unitType: weightUnit,
      unitSize: weight,
      stock,
      status: 'active',
      onlineVisible: true,
    });

    await product.save();

    return NextResponse.json(
      {
        message: 'Product created successfully',
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
