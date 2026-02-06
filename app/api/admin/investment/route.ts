import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Investment, Wallet, Transaction } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();

    const investments = await Investment.find({}).sort({ investmentDate: -1 });
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const remainingBalance = investments.reduce(
      (sum, inv) => sum + inv.remainingBalance,
      0
    );

    return NextResponse.json({
      investments,
      totalInvestment,
      remainingBalance,
    });
  } catch (error) {
    console.error('[v0] Investment fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { amount, source, description } = body;

    if (amount <= 0 || !source) {
      return NextResponse.json({ error: 'Invalid investment data' }, { status: 400 });
    }

    // Create investment
    const investment = await Investment.create({
      amount,
      source,
      description,
      remainingBalance: amount,
      status: 'active',
    });

    // Update wallet
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

    wallet[source as keyof typeof wallet] += amount;
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Record transaction
    await Transaction.create({
      type: 'income',
      category: 'investment',
      amount,
      source,
      description: `Investment: ${description}`,
    });

    return NextResponse.json({
      success: true,
      investment,
    });
  } catch (error) {
    console.error('[v0] Investment creation error:', error);
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 });
  }
}
