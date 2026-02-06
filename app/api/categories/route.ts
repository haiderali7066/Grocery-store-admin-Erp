import { connectDB } from '@/lib/db';
import { Category } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const categories = await Category.find({ isVisible: true }).sort({
      sortOrder: 1,
    });

    return NextResponse.json(
      { categories },
      { status: 200 }
    );
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
