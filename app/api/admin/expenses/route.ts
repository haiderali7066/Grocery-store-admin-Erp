// FILE PATH: app/api/admin/expenses/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction, Wallet } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

// ── No "card" — wallet has no card bucket ─────────────────────────────────────
const VALID_SOURCES = ["cash", "bank", "easypaisa", "jazzcash"] as const;
type Source = (typeof VALID_SOURCES)[number];

// Maps lowercase incoming source → exact Wallet document field name
const WALLET_KEY: Record<Source, string> = {
  cash:      "cash",
  bank:      "bank",
  easypaisa: "easyPaisa",   // ← camelCase field on the Wallet doc
  jazzcash:  "jazzCash",    // ← camelCase field on the Wallet doc
};

const WALLET_LABEL: Record<Source, string> = {
  cash:      "Cash",
  bank:      "Bank",
  easypaisa: "EasyPaisa",
  jazzcash:  "JazzCash",
};

// ── GET — current month's expenses ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // auth check (relaxed — accountants also need access)
    const token   = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || !["admin", "accountant", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    // Exclude internal ledger entries so only user-created expenses show here
    const expenses = await Transaction.find({
      type:     "expense",
      category: { $nin: ["Refund", "Delivery Loss", "Supplier Payment", "Purchase"] },
      createdAt: { $gte: start },
    }).sort({ createdAt: -1 });

    const total = expenses.reduce((acc, e) => acc + e.amount, 0);

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        _id:         e._id.toString(),
        category:    e.category,
        amount:      e.amount,
        description: e.description || "",
        source:      e.source      || "cash",
        date:        e.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error: any) {
    console.error("[Expenses GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST — add new expense ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token   = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || !["admin", "accountant"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, description, category, source = "cash" } = await req.json();

    if (!amount || !category)
      return NextResponse.json({ error: "Amount and category are required" }, { status: 400 });

    const sourceKey = (source as string).toLowerCase() as Source;
    if (!VALID_SOURCES.includes(sourceKey))
      return NextResponse.json(
        { error: `Invalid payment source "${source}". Accepted: ${VALID_SOURCES.join(", ")}` },
        { status: 400 },
      );

    const walletField = WALLET_KEY[sourceKey];
    const paying      = Number(amount);

    // ── Hard wallet balance check ──────────────────────────────────────────
    const wallet = await Wallet.findOne({});
    if (!wallet)
      return NextResponse.json({ error: "Wallet not initialised" }, { status: 404 });

    const available = (wallet as any)[walletField] ?? 0;
    if (paying > available)
      return NextResponse.json(
        {
          error:      `Insufficient ${WALLET_LABEL[sourceKey]} balance. Available: Rs ${available.toLocaleString()}, Required: Rs ${paying.toLocaleString()}`,
          code:       "INSUFFICIENT_WALLET_BALANCE",
          available,
          required:   paying,
          walletField,
        },
        { status: 400 },
      );

    // ── Atomic: deduct wallet + create Transaction ─────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // KEY FIX: cast to `any` so Mongoose doesn't silently ignore the dynamic key
      (wallet as any)[walletField] = available - paying;
      wallet.lastUpdated = new Date();
      await wallet.save({ session });

      const expense = await Transaction.create(
        [{
          type:        "expense",
          amount:      paying,
          category,
          description: description || "",
          source:      walletField,   // store canonical field name for consistent lookup
          createdBy:   payload.userId,
        }],
        { session },
      );

      await session.commitTransaction();

      return NextResponse.json(
        {
          _id:         expense[0]._id.toString(),
          category:    expense[0].category,
          amount:      expense[0].amount,
          description: expense[0].description || "",
          source:      expense[0].source,
          date:        expense[0].createdAt.toISOString(),
        },
        { status: 201 },
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error: any) {
    console.error("[Expenses POST]", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}