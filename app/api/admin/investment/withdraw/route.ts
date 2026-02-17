// app/api/admin/investment/withdraw/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Investment, Wallet, Transaction } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

const WALLET_KEY: Record<string, string> = {
  cash: "cash",
  bank: "bank",
  easypaisa: "easyPaisa",
  jazzcash: "jazzCash",
  card: "card",
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      investmentId,
      amount,
      reason,
      destination = "cash",
    } = await req.json();

    if (!investmentId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid withdrawal data" },
        { status: 400 },
      );
    }

    const investment = await Investment.findById(investmentId);
    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 },
      );
    }

    if (Number(amount) > investment.remainingBalance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: Rs. ${investment.remainingBalance.toLocaleString()}`,
        },
        { status: 400 },
      );
    }

    // Deduct from investment
    investment.remainingBalance -= Number(amount);
    if (investment.remainingBalance <= 0) {
      investment.remainingBalance = 0;
      investment.status = "exhausted";
    }
    await investment.save();

    // Credit destination wallet
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
    const key = WALLET_KEY[destination] || "cash";
    wallet[key] = (wallet[key] || 0) + Number(amount);
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Record transaction
    await Transaction.create({
      type: "expense",
      category: "investment_withdrawal",
      amount: Number(amount),
      source: destination,
      description: `Investment withdrawal: ${reason || "manual"}`,
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal successful",
      remainingBalance: investment.remainingBalance,
    });
  } catch (error: any) {
    console.error("Withdrawal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
