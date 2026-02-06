import { connectDB } from '@/lib/db';
import { Bundle } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const filter: any = {};

    if (isActive === 'true') {
      filter.isActive = true;
    }

    const bundles = await Bundle.find(filter)
      .limit(limit)
      .skip(skip)
      .populate('products.product');

    const total = await Bundle.countDocuments(filter);

    return NextResponse.json(
      {
        bundles,
        total,
        page: Math.floor(skip / limit) + 1,
        pages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Bundles fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
