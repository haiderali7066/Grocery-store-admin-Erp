// app/api/admin/suppliers/[id]/pay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier, Wallet, Transaction } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !["admin", "accountant"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { amount, paymentSource, notes } = await req.json();

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid payment amount is required" },
        { status: 400 },
      );
    }

    if (
      !paymentSource ||
      !["cash", "bank", "easypaisa", "jazzcash", "card"].includes(paymentSource)
    ) {
      return NextResponse.json(
        { error: "Valid payment source is required" },
        { status: 400 },
      );
    }

    // Get supplier
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    // Get wallet
    let wallet = await Wallet.findOne();
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found. Please initialize wallet first." },
        { status: 404 },
      );
    }

    // Map payment source to wallet field
    const walletFieldMap: Record<string, keyof typeof wallet> = {
      cash: "cash",
      bank: "bank",
      easypaisa: "easyPaisa",
      jazzcash: "jazzCash",
      card: "card",
    };

    const walletField = walletFieldMap[paymentSource];
    const currentBalance = (wallet as any)[walletField] || 0;

    // Check if sufficient funds
    if (currentBalance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient funds in ${paymentSource} wallet. Available: Rs. ${currentBalance.toLocaleString()}, Required: Rs. ${amount.toLocaleString()}`,
        },
        { status: 400 },
      );
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Deduct from wallet
      (wallet as any)[walletField] -= amount;
      wallet.lastUpdated = new Date();
      await wallet.save({ session });

      // Update supplier balance (reduce the amount we owe)
      const previousBalance = supplier.balance || 0;
      supplier.balance = Math.max(0, previousBalance - amount);
      await supplier.save({ session });

      // Create transaction record
      await Transaction.create(
        [
          {
            type: "expense",
            category: "Supplier Payment",
            amount,
            source: paymentSource,
            reference: supplier._id,
            referenceModel: "Supplier",
            description: `Payment to supplier: ${supplier.name}`,
            notes:
              notes ||
              `Paid Rs. ${amount.toLocaleString()} to ${supplier.name}. Previous balance: Rs. ${previousBalance.toLocaleString()}, New balance: Rs. ${supplier.balance.toLocaleString()}`,
            createdBy: payload.userId,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      return NextResponse.json(
        {
          message: "Payment successful",
          supplier: {
            _id: supplier._id,
            name: supplier.name,
            previousBalance,
            newBalance: supplier.balance,
            amountPaid: amount,
          },
          wallet: {
            source: paymentSource,
            previousBalance: currentBalance,
            newBalance: (wallet as any)[walletField],
          },
        },
        { status: 200 },
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Supplier payment error:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 },
    );
  }
}
