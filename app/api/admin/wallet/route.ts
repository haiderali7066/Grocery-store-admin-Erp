import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Wallet, Transaction } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

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

    // Get recent transactions
    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdBy', 'name email');

    const walletData = {
      cash: wallet.cash,
      bank: wallet.bank,
      easyPaisa: wallet.easyPaisa,
      jazzCash: wallet.jazzCash,
      card: wallet.card,
      totalBalance: wallet.cash + wallet.bank + wallet.easyPaisa + wallet.jazzCash + wallet.card,
    };

    return NextResponse.json({
      wallet: walletData,
      transactions,
    });
  } catch (error) {
    console.error('[v0] Wallet fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { amount, source, destination, category, type, description } = body;

    // Update wallet
    const wallet = await Wallet.findOne({});
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not initialized' }, { status: 400 });
    }

    // Deduct from source
    if (wallet[source] < amount) {
      return NextResponse.json({ error: `Insufficient ${source} balance` }, { status: 400 });
    }

    wallet[source] -= amount;
    if (destination) {
      wallet[destination] = (wallet[destination] || 0) + amount;
    }
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Record transaction
    const transaction = await Transaction.create({
      type: type || 'transfer',
      category: category || 'manual_transfer',
      amount,
      source,
      destination,
      description,
    });

    return NextResponse.json({
      success: true,
      wallet: wallet.toObject(),
      transaction,
    });
  } catch (error) {
    console.error('[v0] Wallet update error:', error);
    return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 });
  }
}
