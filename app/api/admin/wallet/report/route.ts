// app/api/admin/wallet/report/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Wallet, Transaction } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import moment from "moment";

const WALLET_KEYS = ["cash", "bank", "easyPaisa", "jazzCash"] as const;

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "monthly";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build date range
    let start: Date;
    let end: Date = moment().endOf("day").toDate();

    switch (period) {
      case "today":
        start = moment().startOf("day").toDate();
        break;
      case "weekly":
        start = moment().subtract(7, "days").startOf("day").toDate();
        break;
      case "custom":
        if (!dateFrom || !dateTo) {
          return NextResponse.json({ error: "dateFrom and dateTo required for custom period" }, { status: 400 });
        }
        start = moment(dateFrom).startOf("day").toDate();
        end = moment(dateTo).endOf("day").toDate();
        break;
      case "monthly":
      default:
        start = moment().startOf("month").toDate();
        break;
    }

    // Fetch transactions in range
    const transactions = await Transaction.find({
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .lean();

    // ── Summary ──────────────────────────────────────────────────────────────
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    // ── By Wallet ────────────────────────────────────────────────────────────
    const byWallet: Record<string, { income: number; expense: number; transfer: number; net: number }> = {};
    for (const key of WALLET_KEYS) {
      byWallet[key] = { income: 0, expense: 0, transfer: 0, net: 0 };
    }

    // ── By Category ──────────────────────────────────────────────────────────
    const categoryMap: Map<string, { amount: number; type: string }> = new Map();

    for (const tx of transactions) {
      const amount = tx.amount || 0;

      if (tx.type === "income") {
        totalIncome += amount;
        if (tx.source && byWallet[tx.source]) {
          byWallet[tx.source].income += amount;
          byWallet[tx.source].net += amount;
        }
      } else if (tx.type === "expense") {
        totalExpenses += amount;
        if (tx.source && byWallet[tx.source]) {
          byWallet[tx.source].expense += amount;
          byWallet[tx.source].net -= amount;
        }
      } else if (tx.type === "transfer") {
        totalTransfers += amount;
        if (tx.source && byWallet[tx.source]) {
          byWallet[tx.source].transfer += amount;
        }
        if (tx.destination && byWallet[tx.destination]) {
          byWallet[tx.destination].transfer += amount;
        }
      }

      // Category aggregation
      const catKey = `${tx.category}__${tx.type}`;
      if (categoryMap.has(catKey)) {
        categoryMap.get(catKey)!.amount += amount;
      } else {
        categoryMap.set(catKey, { amount, type: tx.type });
      }
    }

    const byCategory = Array.from(categoryMap.entries())
      .map(([key, val]) => ({
        category: key.split("__")[0],
        amount: val.amount,
        type: val.type,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpenses,
        totalTransfers,
        netFlow: totalIncome - totalExpenses,
        txCount: transactions.length,
      },
      byWallet,
      byCategory,
      transactions: transactions.map((t: any) => ({
        _id: t._id.toString(),
        type: t.type,
        category: t.category,
        amount: t.amount,
        source: t.source,
        destination: t.destination,
        description: t.description,
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Report failed" }, { status: 500 });
  }
}