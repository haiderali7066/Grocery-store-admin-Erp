// app/api/admin/wallet/transfer/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

const VALID_WALLETS = ["cash", "bank", "easyPaisa", "jazzCash"];

function buildWalletResponse(wallet: any) {
  return {
    cash: wallet.cash || 0,
    bank: wallet.bank || 0,
    easyPaisa: wallet.easyPaisa || 0,
    jazzCash: wallet.jazzCash || 0,
    totalBalance:
      (wallet.cash || 0) +
      (wallet.bank || 0) +
      (wallet.easyPaisa || 0) +
      (wallet.jazzCash || 0),
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, fromMethod, toMethod } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }
    if (!fromMethod || !VALID_WALLETS.includes(fromMethod)) {
      return NextResponse.json(
        { error: "Invalid source wallet" },
        { status: 400 },
      );
    }
    if (!toMethod || !VALID_WALLETS.includes(toMethod)) {
      return NextResponse.json(
        { error: "Invalid destination wallet" },
        { status: 400 },
      );
    }
    if (fromMethod === toMethod) {
      return NextResponse.json(
        { error: "Source and destination must be different" },
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

    // Check sufficient balance
    const sourceBalance = wallet[fromMethod] || 0;
    if (sourceBalance < Number(amount)) {
      return NextResponse.json(
        {
          error: `Insufficient ${fromMethod} balance. Available: Rs. ${sourceBalance.toLocaleString()}`,
        },
        { status: 400 },
      );
    }

    // Execute transfer
    wallet[fromMethod] = sourceBalance - Number(amount);
    wallet[toMethod] = (wallet[toMethod] || 0) + Number(amount);
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Record transaction
    await Transaction.create({
      type: "transfer",
      category: "wallet_transfer",
      amount: Number(amount),
      source: fromMethod,
      destination: toMethod,
      description: `Transfer from ${fromMethod} to ${toMethod}`,
    });

    return NextResponse.json({
      success: true,
      message: `Rs. ${Number(amount).toLocaleString()} transferred from ${fromMethod} to ${toMethod}`,
      wallet: buildWalletResponse(wallet),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Transfer failed" },
      { status: 500 },
    );
  }
}
