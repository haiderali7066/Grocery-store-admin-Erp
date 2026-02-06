import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const isFeatured = searchParams.get('isFeatured');
    const isHot = searchParams.get('isHot');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const filter: any = { status: 'active', onlineVisible: true };

    if (isFeatured === 'true') {
      filter.isFeatured = true;
    }
    if (isHot === 'true') {
      filter.isHot = true;
    }
    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .limit(limit)
      .skip(skip)
      .populate('category');

    const total = await Product.countDocuments(filter);

    return NextResponse.json(
      {
        products,
        total,
        page: Math.floor(skip / limit) + 1,
        pages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Products fetch error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
