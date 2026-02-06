import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Wallet, Transaction } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { amount, fromMethod, toMethod } = body;

    if (amount <= 0 || !fromMethod || !toMethod || fromMethod === toMethod) {
      return NextResponse.json({ error: 'Invalid transfer parameters' }, { status: 400 });
    }

    // Get wallet
    let wallet = await Wallet.findOne({});
    if (!wallet) {
      wallet = await Wallet.create({
        cash: 0,
        bank: 0,
        easyPaisa: 0,
        jazzCash: 0,
        card: 0,
      });
    }

    // Validate balance
    if (wallet[fromMethod as keyof typeof wallet] < amount) {
      return NextResponse.json(
        { error: `Insufficient ${fromMethod} balance` },
        { status: 400 }
      );
    }

    // Execute transfer
    wallet[fromMethod as keyof typeof wallet] -= amount;
    wallet[toMethod as keyof typeof wallet] += amount;
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Record transaction
    await Transaction.create({
      type: 'transfer',
      category: 'wallet_transfer',
      amount,
      source: fromMethod,
      destination: toMethod,
      description: `Transfer from ${fromMethod} to ${toMethod}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer successful',
      wallet: {
        cash: wallet.cash,
        bank: wallet.bank,
        easyPaisa: wallet.easyPaisa,
        jazzCash: wallet.jazzCash,
        card: wallet.card,
        totalBalance: wallet.cash + wallet.bank + wallet.easyPaisa + wallet.jazzCash + wallet.card,
      },
    });
  } catch (error) {
    console.error('[v0] Transfer error:', error);
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 });
  }
}
