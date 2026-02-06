import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // In a real app, update in database
    console.log('[v0] Review approved:', params.id);
    return NextResponse.json({ message: 'Review approved' });
  } catch (error) {
    console.error('[v0] Error approving review:', error);
    return NextResponse.json(
      { message: 'Failed to approve review' },
      { status: 500 }
    );
  }
}
