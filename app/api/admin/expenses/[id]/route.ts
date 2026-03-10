// FILE PATH: app/api/admin/expenses/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction, Wallet } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  return verifyToken(token);
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || !["admin", "accountant", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const expense = await Transaction.findOne({ _id: id, type: "expense" });
    if (!expense)
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    return NextResponse.json({
      _id:         expense._id.toString(),
      category:    expense.category,
      amount:      expense.amount,
      description: expense.description || "",
      source:      expense.source,
      date:        expense.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
// Deleting an expense reverses the wallet deduction so the balance stays correct.

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || !["admin", "accountant"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;

    const expense = await Transaction.findOne({ _id: id, type: "expense" });
    if (!expense)
      return NextResponse.json({ error: "Expense not found or already deleted" }, { status: 404 });

    // Only refund wallet for internal-source expenses (not supplier payments etc.)
    // The source field stores the canonical wallet field name (e.g. "easyPaisa")
    const REFUNDABLE_FIELDS = ["cash", "bank", "easyPaisa", "jazzCash"];
    const walletField        = expense.source as string;
    const shouldRefund       = REFUNDABLE_FIELDS.includes(walletField);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Refund the wallet
      if (shouldRefund) {
        const wallet = await Wallet.findOne({}).session(session);
        if (wallet) {
          (wallet as any)[walletField] = ((wallet as any)[walletField] ?? 0) + expense.amount;
          wallet.lastUpdated = new Date();
          await wallet.save({ session });
        }
      }

      await Transaction.findOneAndDelete({ _id: id, type: "expense" }, { session });

      await session.commitTransaction();
      return NextResponse.json({ message: "Expense deleted and wallet refunded" }, { status: 200 });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error: any) {
    console.error("[Expense DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}