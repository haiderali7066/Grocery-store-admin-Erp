import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // In a real app, delete from database
    console.log('[v0] Review deleted:', params.id);
    return NextResponse.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('[v0] Error deleting review:', error);
    return NextResponse.json(
      { message: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
