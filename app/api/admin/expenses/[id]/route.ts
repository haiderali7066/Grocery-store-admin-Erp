import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // This would normally delete from database
    // For now, just return success
    return NextResponse.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('[v0] Delete expense error:', error);
    return NextResponse.json(
      { message: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
