import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

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

    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(50);

    const walletData = {
      cash: wallet.cash || 0,
      bank: wallet.bank || 0,
      easyPaisa: wallet.easyPaisa || 0,
      jazzCash: wallet.jazzCash || 0,
      card: wallet.card || 0,
      totalBalance:
        wallet.cash +
        wallet.bank +
        wallet.easyPaisa +
        wallet.jazzCash +
        wallet.card,
      // Optional: Calculate totals from transactions for the summary cards
    };

    return NextResponse.json({ wallet: walletData, transactions });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 },
    );
  }
}
