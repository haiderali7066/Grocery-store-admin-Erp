import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, Product } from '@/lib/models/index';
import { deductStock } from '@/lib/services/stockService';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(request.headers.get('cookie') || '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { customerName, items, subtotal, tax, total, amountPaid, change, paymentMethod } = body;

    if (!customerName || !items || items.length === 0) {
      return NextResponse.json(
        { message: 'Invalid bill data' },
        { status: 400 }
      );
    }

    // Check stock availability
    const stockItems = items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    // Deduct stock from inventory
    const stockDeduction = await deductStock(stockItems);
    if (!stockDeduction.success) {
      return NextResponse.json(
        { message: `Stock deduction failed: ${stockDeduction.error}` },
        { status: 400 }
      );
    }

    // Create order record for POS
    const billNumber = `POS-${Date.now()}`;
    const order = new Order({
      orderNumber: billNumber,
      user: payload.userId,
      items: items.map((item: any) => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.total,
      })),
      shippingAddress: {
        city: 'Walk-in',
        province: 'POS',
      },
      subtotal,
      gstAmount: tax,
      total,
      paymentMethod,
      paymentStatus: 'verified',
      orderStatus: 'completed',
      isPOS: true,
    });

    await order.save();

    const bill = {
      _id: billNumber,
      customerName,
      items,
      subtotal,
      tax,
      total,
      amountPaid,
      change,
      paymentMethod,
      createdAt: new Date().toISOString(),
      orderId: order._id,
    };

    console.log('[v0] POS Bill created:', billNumber);

    return NextResponse.json(bill, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Error processing POS bill:', error);
    return NextResponse.json(
      { message: 'Failed to process bill', error: error.message },
      { status: 500 }
    );
  }
}
