// app/api/admin/expenses/route.ts
// Updated: accepts `source` field (was hardcoded to "cash")

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction, Wallet } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

const VALID_SOURCES = ["cash", "bank", "easypaisa", "jazzcash", "card"];

const WALLET_KEY: Record<string, string> = {
  cash: "cash",
  bank: "bank",
  easypaisa: "easyPaisa",
  jazzcash: "jazzCash",
  card: "card",
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Current month only
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const expenses = await Transaction.find({
      type: "expense",
      createdAt: { $gte: start },
    }).sort({ createdAt: -1 });

    const total = expenses.reduce((acc, e) => acc + e.amount, 0);

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        _id: e._id.toString(),
        category: e.category,
        amount: e.amount,
        description: e.description || "",
        source: e.source || "cash",
        date: e.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { amount, description, category, source = "cash" } = body;

    if (!amount || !category) {
      return NextResponse.json(
        { error: "Amount and category are required" },
        { status: 400 },
      );
    }

    if (!VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: "Invalid payment source" },
        { status: 400 },
      );
    }

    // Deduct from the appropriate wallet bucket
    let wallet = await Wallet.findOne({});
    if (wallet) {
      const key = WALLET_KEY[source];
      if (key && wallet[key] !== undefined) {
        wallet[key] = Math.max(0, wallet[key] - Number(amount));
        wallet.lastUpdated = new Date();
        await wallet.save();
      }
    }

    const expense = await Transaction.create({
      type: "expense",
      amount: Number(amount),
      category,
      description: description || "",
      source, // ← dynamic, no longer hardcoded
    });

    return NextResponse.json(
      {
        _id: expense._id.toString(),
        category: expense.category,
        amount: expense.amount,
        description: expense.description || "",
        source: expense.source,
        date: expense.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong" },
      { status: 500 },
    );
  }
}
