// FILE PATH: app/api/admin/suppliers/[id]/pay/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier, Purchase, Wallet, Transaction } from "@/lib/models/index";
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
    if (!payload || !["admin", "accountant", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { amount, paymentSource, notes } = await req.json();

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });

    const sourceKey   = (paymentSource ?? "").toLowerCase();
    const walletField = WALLET_KEY[sourceKey];
    if (!walletField)
      return NextResponse.json(
        { error: `Invalid payment source: "${paymentSource}". Accepted: cash, bank, easypaisa, jazzcash` },
        { status: 400 },
      );

    const supplier = await Supplier.findById(id);
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    const wallet = await Wallet.findOne();
    if (!wallet)
      return NextResponse.json({ error: "Wallet not found. Please initialise wallet first." }, { status: 404 });

    const available = (wallet as any)[walletField] ?? 0;
    const paying    = Number(amount);
    const label     = PAYMENT_LABEL[sourceKey] ?? paymentSource;

    if (paying > available)
      return NextResponse.json(
        {
          error:    `Insufficient ${label} wallet balance. Available: Rs ${available.toLocaleString()}, Required: Rs ${paying.toLocaleString()}`,
          code:     "INSUFFICIENT_WALLET_BALANCE",
          available,
          required: paying,
        },
        { status: 400 },
      );

    // ── Fetch unpaid/partial purchases oldest-first ─────────────────────────
    // We distribute the payment across these in order so each purchase row
    // shows the correct amountPaid, balanceDue, and paymentStatus.
    const unpaidPurchases = await Purchase.find({
      supplier: id,
      paymentStatus: { $in: ["pending", "partial"] },
    }).sort({ createdAt: 1 }); // oldest first — FIFO settlement

    // ── Atomic transaction ──────────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Deduct wallet
      (wallet as any)[walletField] = available - paying;
      wallet.lastUpdated = new Date();
      await wallet.save({ session });

      // 2. Distribute payment across purchases oldest-first
      let remaining = paying;
      const updatedPurchases: string[] = [];

      for (const purchase of unpaidPurchases) {
        if (remaining <= 0) break;

        const due = (purchase as any).balanceDue ?? 0;
        if (due <= 0) continue;

        const applying = Math.min(remaining, due);
        const newPaid  = ((purchase as any).amountPaid ?? 0) + applying;
        const newDue   = due - applying;

        await Purchase.findByIdAndUpdate(
          purchase._id,
          {
            $set: {
              amountPaid:    newPaid,
              balanceDue:    newDue,
              paymentStatus: newDue <= 0 ? "completed" : "partial",
            },
          },
          { session }
        );

        updatedPurchases.push(purchase._id.toString());
        remaining -= applying;
      }

      // If remaining > 0 after all unpaid purchases, there's overpayment or
      // purchases were already fully settled — just reduce supplier balance normally.
      // (remaining amount is still deducted from wallet as already done above)

      // 3. Reduce supplier balance
      const previousBalance  = supplier.balance ?? 0;
      supplier.balance       = Math.max(0, previousBalance - paying);
      await supplier.save({ session });

      // 4. Record transaction
      await Transaction.create(
        [{
          type:           "expense",
          category:       "Supplier Payment",
          amount:         paying,
          source:         walletField,
          reference:      supplier._id,
          referenceModel: "Supplier",
          description:    `Payment to supplier: ${supplier.name}`,
          notes:          notes || `Paid Rs ${paying.toLocaleString()} to ${supplier.name}. Previous balance: Rs ${previousBalance.toLocaleString()}, New balance: Rs ${supplier.balance.toLocaleString()}. Applied to ${updatedPurchases.length} purchase(s).`,
          createdBy:      payload.userId,
        }],
        { session },
      );

      await session.commitTransaction();

      return NextResponse.json(
        {
          message: `Payment of Rs ${paying.toLocaleString()} applied to ${updatedPurchases.length} purchase(s)`,
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
          updatedPurchases,
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