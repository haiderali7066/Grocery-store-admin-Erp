// FILE PATH: app/api/admin/suppliers/[id]/pay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier, Wallet, Transaction } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

// Maps lowercase incoming paymentSource → exact Wallet document field name
const WALLET_KEY: Record<string, string> = {
  cash:      "cash",
  bank:      "bank",
  easypaisa: "easyPaisa",
  jazzcash:  "jazzCash",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash:      "Cash",
  bank:      "Bank",
  easypaisa: "EasyPaisa",
  jazzcash:  "JazzCash",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !["admin", "accountant"].includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { amount, paymentSource, notes } = await req.json();

    // Validate amount
    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });

    // Validate payment source
    const sourceKey = paymentSource?.toLowerCase?.() ?? "";
    const walletField = WALLET_KEY[sourceKey];
    if (!walletField)
      return NextResponse.json(
        { error: `Invalid payment source: "${paymentSource}". Accepted: cash, bank, easypaisa, jazzcash` },
        { status: 400 },
      );

    // Get supplier
    const supplier = await Supplier.findById(id);
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // Get wallet
    let wallet = await Wallet.findOne();
    if (!wallet)
      return NextResponse.json({ error: "Wallet not found. Please initialise wallet first." }, { status: 404 });

    // Hard balance check — wallet must have enough funds
    const available = (wallet as any)[walletField] ?? 0;
    const paying    = Number(amount);
    const label     = PAYMENT_LABEL[sourceKey] ?? paymentSource;

    if (paying > available)
      return NextResponse.json(
        {
          error: `Insufficient ${label} wallet balance. Available: Rs ${available.toLocaleString()}, Required: Rs ${paying.toLocaleString()}`,
          code: "INSUFFICIENT_WALLET_BALANCE",
          available,
          required: paying,
        },
        { status: 400 },
      );

    // Atomic transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Deduct wallet
      (wallet as any)[walletField] = available - paying;
      wallet.lastUpdated = new Date();
      await wallet.save({ session });

      // Reduce supplier balance
      const previousBalance = supplier.balance || 0;
      supplier.balance = Math.max(0, previousBalance - paying);
      await supplier.save({ session });

      // Record transaction
      await Transaction.create(
        [{
          type:           "expense",
          category:       "Supplier Payment",
          amount:         paying,
          source:         walletField,           // canonical field name
          reference:      supplier._id,
          referenceModel: "Supplier",
          description:    `Payment to supplier: ${supplier.name}`,
          notes:          notes || `Paid Rs ${paying.toLocaleString()} to ${supplier.name}. Previous balance: Rs ${previousBalance.toLocaleString()}, New balance: Rs ${supplier.balance.toLocaleString()}`,
          createdBy:      payload.userId,
        }],
        { session },
      );

      await session.commitTransaction();

      return NextResponse.json(
        {
          message: "Payment successful",
          supplier: {
            _id:             supplier._id,
            name:            supplier.name,
            previousBalance,
            newBalance:      supplier.balance,
            amountPaid:      paying,
          },
          wallet: {
            source:          label,
            walletField,
            previousBalance: available,
            newBalance:      (wallet as any)[walletField],
          },
        },
        { status: 200 },
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("[Supplier Pay]", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}