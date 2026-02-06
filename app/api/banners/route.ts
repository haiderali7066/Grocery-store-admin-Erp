import { connectDB } from '@/lib/db';
import { HeroBanner } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const banners = await HeroBanner.find({ isActive: true })
      .sort({ sortOrder: 1 });

    // Return default banners if none exist
    if (banners.length === 0) {
      return NextResponse.json(
        {
          banners: [
            {
              id: '1',
              title: 'Fresh & Pure',
              subtitle: 'Quality groceries delivered to your door',
              image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=400&fit=crop',
              link: '/products',
            },
          ],
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { banners },
      { status: 200 }
    );
  } catch (error) {
    console.error('Banners fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
