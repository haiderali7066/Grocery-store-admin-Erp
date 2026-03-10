"use client";
// FILE PATH: app/admin/expenses/page.tsx

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, DollarSign, Banknote, Landmark,
  Smartphone, Filter, Wallet as WalletIcon, AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Expense {
  _id:         string;
  category:    string;
  amount:      number;
  description: string;
  source:      string;
  date:        string;
}

interface WalletBalances {
  cash: number; bank: number; easyPaisa: number; jazzCash: number;
}

// ── Constants — no "card" ─────────────────────────────────────────────────────

const SOURCES = [
  { value: "cash",      label: "Cash",      walletKey: "cash",      icon: <Banknote   className="h-3.5 w-3.5" /> },
  { value: "bank",      label: "Bank",      walletKey: "bank",      icon: <Landmark   className="h-3.5 w-3.5" /> },
  { value: "easypaisa", label: "EasyPaisa", walletKey: "easyPaisa", icon: <Smartphone className="h-3.5 w-3.5" /> },
  { value: "jazzcash",  label: "JazzCash",  walletKey: "jazzCash",  icon: <Smartphone className="h-3.5 w-3.5" /> },
];

// Maps canonical wallet field names back to display labels (for expense list)
const WALLET_FIELD_LABEL: Record<string, string> = {
  cash: "Cash", bank: "Bank", easyPaisa: "EasyPaisa", jazzCash: "JazzCash",
};

const CATEGORIES = [
  "rent", "utilities", "salary", "maintenance",
  "marketing", "transport", "packaging", "miscellaneous", "other",
];

const SOURCE_COLORS: Record<string, string> = {
  cash:      "bg-green-100 text-green-700",
  bank:      "bg-blue-100 text-blue-700",
  easypaisa: "bg-emerald-100 text-emerald-700",
  easyPaisa: "bg-emerald-100 text-emerald-700",
  jazzcash:  "bg-red-100 text-red-700",
  jazzCash:  "bg-red-100 text-red-700",
};

const Rs = (n: number) => `Rs. ${(n ?? 0).toLocaleString()}`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses,      setExpenses]      = useState<Expense[]>([]);
  const [wallet,        setWallet]        = useState<WalletBalances | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading,     setIsLoading]     = useState(true);
  const [showDialog,    setShowDialog]    = useState(false);
  const [filterSource,  setFilterSource]  = useState("all");
  const [submitError,   setSubmitError]   = useState("");
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  const [formData, setFormData] = useState({
    category:    "rent",
    amount:      "",
    description: "",
    source:      "cash",
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotalExpenses(data.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch("/api/admin/wallet");
      if (res.ok) { const d = await res.json(); setWallet(d.wallet || null); }
    } catch {}
  };

  useEffect(() => { fetchExpenses(); fetchWallet(); }, []);

  // ── Live wallet balance for selected source ────────────────────────────────

  const selectedSrc    = SOURCES.find(s => s.value === formData.source);
  const walletAvail    = wallet && selectedSrc ? (wallet as any)[selectedSrc.walletKey] ?? 0 : null;
  const payingAmt      = parseFloat(formData.amount) || 0;
  const isInsufficient = walletAvail !== null && payingAmt > 0 && payingAmt > walletAvail;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!formData.amount) { setSubmitError("Please enter an amount"); return; }
    if (isInsufficient)   { setSubmitError(`Insufficient ${selectedSrc?.label} balance`); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...formData, amount: parseFloat(formData.amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to add expense");
        return;
      }
      setFormData({ category: "rent", amount: "", description: "", source: "cash" });
      setShowDialog(false);
      fetchExpenses();
      fetchWallet();
    } catch { setSubmitError("Failed to add expense"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense? The amount will be refunded to your wallet.")) return;
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
      if (res.ok) { fetchExpenses(); fetchWallet(); }
      else { const d = await res.json(); alert(d.error || "Failed to delete"); }
    } catch { alert("Failed to delete"); }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const bySource = SOURCES.map(s => ({
    ...s,
    // source field stores canonical wallet key (easyPaisa / jazzCash) — match both variants
    total: expenses
      .filter(e => e.source === s.value || e.source === s.walletKey)
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter(s => s.total > 0);

  const filtered = filterSource === "all"
    ? expenses
    : expenses.filter(e => e.source === filterSource || e.source === SOURCES.find(s => s.value === filterSource)?.walletKey);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-1">Track all business expenditures</p>
        </div>
        <Dialog open={showDialog} onOpenChange={open => { setShowDialog(open); if (!open) setSubmitError(""); }}>
          <DialogTrigger asChild>
            <Button className="bg-green-700 hover:bg-green-800 rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">

              {/* Category */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Category</label>
                <select value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Payment source */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Paid From</label>
                <div className="grid grid-cols-2 gap-2">
                  {SOURCES.map(s => (
                    <button key={s.value} type="button"
                      onClick={() => { setFormData({ ...formData, source: s.value }); setSubmitError(""); }}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                        formData.source === s.value
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>

                {/* Live wallet balance */}
                {walletAvail !== null && (
                  <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
                    isInsufficient
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-green-50 border-green-200 text-green-700"
                  }`}>
                    <WalletIcon className="h-3.5 w-3.5 shrink-0" />
                    {selectedSrc?.label} balance: {Rs(walletAvail)}
                    {isInsufficient && (
                      <span className="ml-auto font-black text-red-700">
                        ⚠ Shortfall: {Rs(payingAmt - walletAvail)}
                      </span>
                    )}
                  </div>
                )}
                {walletAvail !== null && payingAmt > 0 && !isInsufficient && (
                  <p className="text-xs text-gray-400 mt-1 ml-1">
                    After expense: {Rs(walletAvail - payingAmt)} remaining
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Amount (Rs)</label>
                <Input type="number" placeholder="0" value={formData.amount}
                  onChange={e => { setFormData({ ...formData, amount: e.target.value }); setSubmitError(""); }}
                  className={`rounded-xl ${isInsufficient ? "border-red-400" : ""}`} required />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label>
                <Input placeholder="Optional notes..." value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl" />
              </div>

              {/* Inline error */}
              {submitError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700 font-medium">{submitError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting || isInsufficient}
                  className={`flex-1 rounded-xl ${isInsufficient ? "bg-gray-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800"}`}>
                  {isSubmitting ? "Adding…" : isInsufficient ? "⚠ Insufficient balance" : "Add Expense"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1 rounded-xl">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-0 shadow-md col-span-2 md:col-span-1 bg-gradient-to-br from-red-50 to-orange-50">
          <p className="text-xs text-gray-500 font-medium mb-1">Total (This Month)</p>
          <p className="text-2xl font-black text-red-600">{Rs(totalExpenses)}</p>
        </Card>
        {bySource.map(s => (
          <Card key={s.value} className="p-4 border-0 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${SOURCE_COLORS[s.value]}`}>
                {s.icon} {s.label}
              </span>
            </div>
            <p className="text-lg font-black text-gray-900">{Rs(s.total)}</p>
          </Card>
        ))}
      </div>

      {/* Wallet snapshot strip */}
      {wallet && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SOURCES.map(s => {
            const bal = (wallet as any)[s.walletKey] ?? 0;
            return (
              <div key={s.value} className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                <div className={`p-2 rounded-lg ${SOURCE_COLORS[s.value]} bg-opacity-20`}>{s.icon}</div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{s.label}</p>
                  <p className="font-black text-gray-900 text-sm">{Rs(bal)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter + expense list */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Expense History</h3>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none">
              <option value="all">All Sources</option>
              {SOURCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <p className="text-gray-400 text-center py-10 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-400 text-center py-12 text-sm">No expenses found</p>
          ) : (
            filtered.map(expense => {
              // source field stores canonical wallet field name (easyPaisa / jazzCash)
              const displayLabel = WALLET_FIELD_LABEL[expense.source] || expense.source;
              const colorKey     = Object.keys(SOURCE_COLORS).find(k => k.toLowerCase() === expense.source.toLowerCase()) || expense.source;
              return (
                <div key={expense._id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                      <DollarSign className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize text-sm">{expense.category}</p>
                      {expense.description && (
                        <p className="text-xs text-gray-400">{expense.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(expense.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${SOURCE_COLORS[colorKey] || "bg-gray-100 text-gray-500"}`}>
                      {displayLabel}
                    </span>
                    <p className="font-black text-red-600 text-sm min-w-[80px] text-right">
                      {Rs(expense.amount)}
                    </p>
                    <button onClick={() => handleDelete(expense._id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}