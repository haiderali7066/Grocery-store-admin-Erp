// app/api/admin/wallet/deposit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

const VALID_WALLETS = ["cash", "bank", "easyPaisa", "jazzCash"];

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletKey, amount, description } = await req.json();

    if (!walletKey || !VALID_WALLETS.includes(walletKey)) {
      return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    let wallet = await Wallet.findOne({});
    if (!wallet) {
      wallet = await Wallet.create({
        cash: 0,
        bank: 0,
        easyPaisa: 0,
        jazzCash: 0,
      });
    }

    // Credit the wallet
    wallet[walletKey] = (wallet[walletKey] || 0) + Number(amount);
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Record as income transaction
    await Transaction.create({
      type: "income",
      category: "wallet_deposit",
      amount: Number(amount),
      source: walletKey,
      description: description || `Manual deposit to ${walletKey}`,
    });

    return NextResponse.json({
      success: true,
      message: `Rs. ${Number(amount).toLocaleString()} added to ${walletKey}`,
      wallet: {
        cash: wallet.cash || 0,
        bank: wallet.bank || 0,
        easyPaisa: wallet.easyPaisa || 0,
        jazzCash: wallet.jazzCash || 0,
        totalBalance:
          (wallet.cash || 0) +
          (wallet.bank || 0) +
          (wallet.easyPaisa || 0) +
          (wallet.jazzCash || 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Deposit failed" },
      { status: 500 },
    );
  }
}
