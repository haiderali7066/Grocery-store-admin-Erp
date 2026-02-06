import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, POSSale, Product, InventoryBatch } from '@/lib/models';
import { submitToFBR } from '@/lib/fbr';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication & admin role
    const authToken = request.cookies.get('token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPayload = verifyAuth(authToken);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { items, paymentMethod, subtotal, gstAmount, totalAmount } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Empty cart' }, { status: 400 });
    }

    // Generate unique sale number
    const saleNumber = 'SALE' + Date.now();

    // Prepare FBR invoice data
    const fbrItems = items.map((item: any) => ({
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      taxAmount: item.taxExempt ? 0 : (item.subtotal * item.gst) / 100,
      total: item.subtotal,
      taxable: !item.taxExempt,
    }));

    // Submit to FBR
    const fbrResponse = await submitToFBR({
      dateTime: new Date().toISOString(),
      ntn: process.env.STORE_NTN || '',
      strn: process.env.STORE_STRN || '',
      items: fbrItems,
      subtotal,
      totalTax: gstAmount,
      totalAmount,
      paymentMethod: paymentMethod as 'cash' | 'card' | 'manual',
    });

    // Calculate FIFO cost and profit
    let totalCost = 0;
    const productIds = items.map((item: any) => item.id);
    const products = await Product.find({ _id: { $in: productIds } });

    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.id);
      if (!product) continue;

      // Get FIFO batches
      const batches = await InventoryBatch.find({
        product: product._id,
        status: { $in: ['active', 'partial'] },
      }).sort({ createdAt: 1 });

      let remainingQty = item.quantity;
      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const qtyFromBatch = Math.min(remainingQty, batch.quantity);
        totalCost += qtyFromBatch * batch.buyingRate;
        remainingQty -= qtyFromBatch;

        // Update batch quantity
        batch.quantity -= qtyFromBatch;
        if (batch.quantity === 0) {
          batch.status = 'finished';
        } else {
          batch.status = 'partial';
        }
        await batch.save();
      }

      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    const profit = totalAmount - totalCost;

    // Create POS sale record
    const sale = new POSSale({
      saleNumber,
      cashier: userPayload.userId,
      items: items.map((item: any) => ({
        product: item.id,
        quantity: item.quantity,
        price: item.price,
        gst: item.gst,
        subtotal: item.subtotal,
      })),
      subtotal,
      gstAmount,
      totalAmount,
      paymentMethod,
      paymentStatus: 'completed',
      fbrInvoiceNumber: fbrResponse.invoiceNumber,
      fbrQrCode: fbrResponse.qrCode,
      fbrTransactionId: fbrResponse.transactionId,
      fbrStatus: fbrResponse.status === 'success' ? 'success' : 'failed',
      fbrResponse,
      profit,
      costOfGoods: totalCost,
      isFinal: true,
      receiptPrinted: false,
    });

    await sale.save();

    return NextResponse.json({
      success: true,
      saleNumber: sale.saleNumber,
      fbrInvoiceNumber: sale.fbrInvoiceNumber,
      qrCode: sale.fbrQrCode,
      profit,
      message: 'Sale completed and submitted to FBR',
    });
  } catch (error) {
    console.error('[POS] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get POS sales
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPayload = verifyAuth(authToken);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await POSSale.find({
      createdAt: { $gte: today },
    })
      .populate('cashier', 'name')
      .sort({ createdAt: -1 });

    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalTax = sales.reduce((sum, sale) => sum + sale.gstAmount, 0);

    return NextResponse.json({
      sales,
      summary: {
        totalSales,
        totalAmount,
        totalProfit,
        totalTax,
        avgSaleValue: totalSales > 0 ? totalAmount / totalSales : 0,
      },
    });
  } catch (error) {
    console.error('[POS] Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}
