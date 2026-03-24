// app/api/admin/wallet/route.ts (FIXED — balances computed from transactions)
// ═════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";

/** Wallet keys we track */
const WALLET_KEYS = ["cash", "bank", "easyPaisa", "jazzCash"] as const;
type WalletKey = (typeof WALLET_KEYS)[number];

/** Derive the wallet key from a transaction (handles both old and new schema shapes) */
function resolveWallet(txn: any, side: "source" | "destination"): WalletKey | null {
  const raw = txn[side] ?? txn.wallet ?? null;
  return WALLET_KEYS.includes(raw) ? (raw as WalletKey) : null;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // ── Ensure wallet document exists (used only as fallback seed) ──────────
    let walletDoc = await Wallet.findOne({});
    if (!walletDoc) {
      walletDoc = await Wallet.create({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0 });
    }

    // ── Query params ─────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const period     = searchParams.get("period") || "monthly";
    const typeFilter = searchParams.get("type");   // "income" | "expense" | "transfer" | null

    // ── Date range for the selected period ───────────────────────────────────
    const startDate = new Date();
    if (period === "daily") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "monthly") {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "yearly") {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    // ── 1. ALL-TIME transactions → compute correct wallet balances ────────────
    //    We intentionally ignore the stored wallet document values because they
    //    can drift if any transaction was saved without updating the document.
    const allTransactions: any[] = await Transaction.find({}).lean();

    const computed: Record<WalletKey, number> = {
      cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0,
    };

    for (const txn of allTransactions) {
      const amount = txn.amount ?? 0;

      if (txn.type === "income") {
        const w = resolveWallet(txn, "source");
        if (w) computed[w] += amount;

      } else if (txn.type === "expense") {
        const w = resolveWallet(txn, "source");
        if (w) computed[w] -= amount;

      } else if (txn.type === "transfer") {
        const from = resolveWallet(txn, "source");
        const to   = resolveWallet(txn, "destination");
        if (from) computed[from] -= amount;
        if (to)   computed[to]   += amount;
      }
    }

    // Persist corrected balances back to the wallet document so the rest of
    // the app stays in sync (fire-and-forget, don't await in hot path).
    Wallet.updateOne(
      { _id: walletDoc._id },
      {
        $set: {
          cash:       computed.cash,
          bank:       computed.bank,
          easyPaisa:  computed.easyPaisa,
          jazzCash:   computed.jazzCash,
        },
      },
    ).exec().catch((e: any) => console.error("[Wallet sync error]", e));

    const walletData = {
      cash:         computed.cash,
      bank:         computed.bank,
      easyPaisa:    computed.easyPaisa,
      jazzCash:     computed.jazzCash,
      totalBalance: computed.cash + computed.bank + computed.easyPaisa + computed.jazzCash,
    };

    // ── 2. Period-filtered transactions → stats & table ──────────────────────
    const filter: any = { createdAt: { $gte: startDate } };
    if (typeFilter && ["income", "expense", "transfer"].includes(typeFilter)) {
      filter.type = typeFilter;
    }

    const transactions: any[] = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // ── Stats (only from period-filtered transactions) ────────────────────────
    const stats = {
      totalTransactions: transactions.length,
      totalIncome:    0,
      totalExpense:   0,
      totalTransfer:  0,
      incomeCount:    0,
      expenseCount:   0,
      transferCount:  0,
    };

    for (const txn of transactions) {
      const amount = txn.amount ?? 0;
      if (txn.type === "income") {
        stats.totalIncome  += amount;
        stats.incomeCount  += 1;
      } else if (txn.type === "expense") {
        stats.totalExpense += amount;
        stats.expenseCount += 1;
      } else if (txn.type === "transfer") {
        stats.totalTransfer += amount;
        stats.transferCount += 1;
      }
    }

    // ── Format for display ────────────────────────────────────────────────────
    const formattedTransactions = transactions.map((txn: any) => ({
      _id:         txn._id?.toString(),
      type:        txn.type,
      category:    txn.category,
      amount:      txn.amount ?? 0,
      source:      txn.source,
      destination: txn.destination,
      wallet:      txn.source ?? txn.destination,
      description: txn.description,
      createdAt:   txn.createdAt,
    }));

    return NextResponse.json({
      success: true,
      wallet:  walletData,
      stats,
      transactions: formattedTransactions,
      period,
      typeFilter,
      metadata: {
        periodLabel:
          period === "daily"   ? "Today" :
          period === "weekly"  ? "Last 7 Days" :
          period === "monthly" ? "This Month"  : "This Year",
        dateRange: {
          from: startDate.toISOString(),
          to:   new Date().toISOString(),
        },
        balanceSource: "computed_from_transactions", // ← helpful for debugging
      },
    });

  } catch (error: any) {
    console.error("[Wallet API Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch wallet" },
      { status: 500 },
    );
  }
}