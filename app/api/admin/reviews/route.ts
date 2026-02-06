import { NextRequest, NextResponse } from 'next/server';

const reviewsDB: any[] = [];

export async function GET() {
  try {
    return NextResponse.json({
      reviews: reviewsDB,
    });
  } catch (error) {
    console.error('[v0] Error fetching reviews:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productName, userId, userName, rating, comment } = body;

    if (!productId || !userId || !rating || !comment) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const review = {
      _id: Date.now().toString(),
      productId,
      productName,
      userId,
      userName,
      rating: parseInt(rating),
      comment,
      isApproved: false,
      createdAt: new Date().toISOString(),
    };

    reviewsDB.push(review);
    console.log('[v0] Review created:', review._id);

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('[v0] Error creating review:', error);
    return NextResponse.json(
      { message: 'Failed to create review' },
      { status: 500 }
    );
  }
}
