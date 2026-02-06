import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber, amount, reason, notes } = body;

    if (!orderNumber || !amount) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const manualReturn = {
      _id: Date.now().toString(),
      order: {
        _id: orderNumber,
        orderNumber: orderNumber,
        total: parseFloat(amount),
      },
      requestedAmount: parseFloat(amount),
      reason,
      status: 'pending',
      notes,
      createdAt: new Date().toISOString(),
      returnType: 'manual',
    };

    console.log('[v0] Manual return created:', manualReturn);

    return NextResponse.json(manualReturn, { status: 201 });
  } catch (error) {
    console.error('[v0] Error creating manual return:', error);
    return NextResponse.json(
      { message: 'Failed to create manual return' },
      { status: 500 }
    );
  }
}
