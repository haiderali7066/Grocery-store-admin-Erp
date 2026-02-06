import { connectDB } from '@/lib/db';
import { Supplier } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const suppliers = await Supplier.find({ isActive: true }).sort({
      name: 1,
    });

    return NextResponse.json(
      { suppliers },
      { status: 200 }
    );
  } catch (error) {
    console.error('Suppliers fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
