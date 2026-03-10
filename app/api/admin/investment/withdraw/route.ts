// FILE PATH: app/api/admin/investment/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Investment, Wallet, Transaction } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

const WALLET_KEY: Record<string, string> = {
  cash:      "cash",
  bank:      "bank",
  easypaisa: "easyPaisa",
  jazzcash:  "jazzCash",
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || !["admin", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { investmentId, amount, reason, destination } = await req.json();

    if (!investmentId || !amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Invalid withdrawal data" }, { status: 400 });

    if (!destination)
      return NextResponse.json({ error: "Destination wallet is required" }, { status: 400 });

    const walletField = WALLET_KEY[destination.toLowerCase()];
    if (!walletField)
      return NextResponse.json({ error: `Unknown destination: ${destination}` }, { status: 400 });

    const investment = await Investment.findById(investmentId);
    if (!investment)
      return NextResponse.json({ error: "Investment not found" }, { status: 404 });

    if (Number(amount) > investment.remainingBalance)
      return NextResponse.json(
        { error: `Insufficient balance. Available: Rs. ${investment.remainingBalance.toLocaleString()}` },
        { status: 400 }
      );

    // Deduct from investment
    investment.remainingBalance -= Number(amount);
    if (investment.remainingBalance <= 0) {
      investment.remainingBalance = 0;
      investment.status = "exhausted";
    }
    await investment.save();

    // Credit destination wallet bucket (using canonical field name)
    let wallet = await Wallet.findOne({});
    if (!wallet)
      wallet = await Wallet.create({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0 });

    (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) + Number(amount);
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Record as income on the wallet side (money flows back in)
    await Transaction.create({
      type:        "income",
      category:    "investment_withdrawal",
      amount:      Number(amount),
      source:      walletField,
      description: `Investment withdrawal to ${destination}: ${reason || "manual"}`,
    });

    return NextResponse.json({
      success:          true,
      message:          `Rs. ${Number(amount).toLocaleString()} withdrawn to ${destination} wallet`,
      remainingBalance: investment.remainingBalance,
    });
  } catch (error: any) {
    console.error("[Investment Withdraw]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}