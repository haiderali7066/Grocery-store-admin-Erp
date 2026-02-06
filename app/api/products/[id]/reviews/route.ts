import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const approved = searchParams.get('approved') === 'true';

    // In a real app, fetch from database
    // For now, return empty array
    const reviews = [];

    return NextResponse.json({
      reviews: approved ? reviews.filter((r: any) => r.isApproved) : reviews,
    });
  } catch (error) {
    console.error('[v0] Error fetching product reviews:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
