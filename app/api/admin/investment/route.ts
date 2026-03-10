// FILE PATH: app/api/admin/investment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Investment, Wallet, Transaction } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// Canonical wallet field names — source input is lowercased before lookup
const WALLET_KEY: Record<string, string> = {
  cash:      "cash",
  bank:      "bank",
  easypaisa: "easyPaisa",
  jazzcash:  "jazzCash",
};

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  return verifyToken(token);
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || !["admin", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50"));
    const skip  = (page - 1) * limit;

    const [investments, total] = await Promise.all([
      Investment.find({}).sort({ investmentDate: -1 }).skip(skip).limit(limit),
      Investment.countDocuments({}),
    ]);

    // Totals are across ALL investments, not just this page
    const all = await Investment.find({}, { amount: 1, remainingBalance: 1 });
    const totalInvestment  = all.reduce((s, i) => s + i.amount,           0);
    const remainingBalance = all.reduce((s, i) => s + i.remainingBalance, 0);

    return NextResponse.json({
      investments,
      totalInvestment,
      remainingBalance,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("[Investment GET]", error);
    return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || !["admin", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, source, description } = await req.json();

    if (!amount || Number(amount) <= 0 || !source)
      return NextResponse.json({ error: "Invalid investment data" }, { status: 400 });

    // Map incoming source to exact wallet field name
    const walletField = WALLET_KEY[source.toLowerCase()];
    if (!walletField)
      return NextResponse.json({ error: `Unknown source: ${source}` }, { status: 400 });

    // Create investment record
    const investment = await Investment.create({
      amount:           Number(amount),
      source,
      description:      description || "",
      remainingBalance: Number(amount),
      status:           "active",
    });

    // Credit the correct wallet bucket
    let wallet = await Wallet.findOne({});
    if (!wallet)
      wallet = await Wallet.create({ cash: 0, bank: 0, easyPaisa: 0, jazzCash: 0 });

    (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) + Number(amount);
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Record as income transaction
    await Transaction.create({
      type:        "income",
      category:    "investment",
      amount:      Number(amount),
      source:      walletField,   // use canonical field name
      description: `Investment: ${description || source}`,
    });

    return NextResponse.json({ success: true, investment });
  } catch (error: any) {
    console.error("[Investment POST]", error);
    return NextResponse.json({ error: "Failed to create investment" }, { status: 500 });
  }
}