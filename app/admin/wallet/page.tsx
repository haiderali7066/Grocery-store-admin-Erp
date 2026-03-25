"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet as WalletIcon,
  ArrowLeftRight,
  Landmark,
  Smartphone,
  Banknote,
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  CheckCircle,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat2,
  Printer,
  Calendar,
  BarChart3,
  FileText,
  PieChart,
  Activity,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface WalletBalance {
  cash: number;
  bank: number;
  easyPaisa: number;
  jazzCash: number;
  totalBalance: number;
}

interface Transaction {
  _id: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  source: string;
  destination?: string;
  description: string;
  createdAt: string;
}

interface WalletReport {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalTransfers: number;
    netFlow: number;
    txCount: number;
  };
  byWallet: Record<string, { income: number; expense: number; transfer: number; net: number }>;
  byCategory: { category: string; amount: number; type: string }[];
  transactions: Transaction[];
}

type ToastType = "success" | "error" | null;
type WalletKey = "cash" | "bank" | "easyPaisa" | "jazzCash";
type ReportTab = "overview" | "cashflow" | "wallet" | "transfers";
type Period = "today" | "weekly" | "monthly" | "custom";

// ── Config ─────────────────────────────────────────────────────────────────

const WALLETS: {
  key: WalletKey;
  label: string;
  icon: React.ElementType;
  color: string;
  light: string;
  text: string;
  border: string;
}[] = [
  { key: "cash", label: "Cash", icon: Banknote, color: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { key: "bank", label: "Bank", icon: Landmark, color: "bg-blue-500", light: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { key: "easyPaisa", label: "EasyPaisa", icon: Smartphone, color: "bg-green-600", light: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  { key: "jazzCash", label: "JazzCash", icon: Smartphone, color: "bg-red-500", light: "bg-red-50", text: "text-red-700", border: "border-red-200" },
];

const TX_STYLES: Record<string, { badge: string; amount: string; icon: React.ElementType; prefix: string }> = {
  income: { badge: "bg-emerald-100 text-emerald-700", amount: "text-emerald-600", icon: ArrowUpCircle, prefix: "+" },
  expense: { badge: "bg-red-100 text-red-700", amount: "text-red-600", icon: ArrowDownCircle, prefix: "−" },
  transfer: { badge: "bg-indigo-100 text-indigo-700", amount: "text-indigo-600", icon: Repeat2, prefix: "" },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "custom", label: "Custom" },
];

const ITEMS_PER_PAGE = 10;

// ── Page ───────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [report, setReport] = useState<WalletReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [walletFilter, setWalletFilter] = useState<"all" | WalletKey>("all");
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [period, setPeriod] = useState<Period>("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({ type: null, message: "" });
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 3500);
  };

  // Dialogs
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<{ walletKey: WalletKey; amount: string; description: string }>({ walletKey: "cash", amount: "", description: "" });
  const [addLoading, setAddLoading] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState<{ fromMethod: WalletKey | ""; toMethod: WalletKey | ""; amount: string }>({ fromMethod: "", toMethod: "", amount: "" });
  const [transferLoading, setTransferLoading] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchWallet = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/admin/wallet");
      const data = await res.json();
      setWallet(data.wallet);
      setTransactions(data.transactions || []);
    } catch {
      showToast("error", "Failed to load wallet data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    setCurrentPage(1);
    try {
      let url = `/api/admin/wallet/report?period=${period}`;
      if (period === "custom" && dateFrom && dateTo) {
        url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch (err: any) {
      showToast("error", err.message || "Failed to load report");
    } finally {
      setReportLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => { fetchWallet(); }, []);
  useEffect(() => {
    if (period !== "custom") fetchReport();
  }, [period]);

  const handlePrint = () => window.print();

  const periodLabel = period === "custom" && dateFrom && dateTo
    ? `${dateFrom} → ${dateTo}`
    : PERIODS.find(p => p.key === period)?.label ?? period;

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAddMoney = async () => {
    const amount = parseFloat(addForm.amount);
    if (!amount || amount <= 0) { showToast("error", "Enter a valid amount"); return; }
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletKey: addForm.walletKey, amount, description: addForm.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWallet(data.wallet);
      setShowAdd(false);
      setAddForm({ walletKey: "cash", amount: "", description: "" });
      showToast("success", `Rs. ${amount.toLocaleString()} added to ${addForm.walletKey}`);
      fetchWallet(true);
      fetchReport();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferForm.amount);
    if (!amount || amount <= 0 || !transferForm.fromMethod || !transferForm.toMethod) { showToast("error", "Fill all fields"); return; }
    if (transferForm.fromMethod === transferForm.toMethod) { showToast("error", "Source and destination must differ"); return; }
    setTransferLoading(true);
    try {
      const res = await fetch("/api/admin/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, fromMethod: transferForm.fromMethod, toMethod: transferForm.toMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWallet(data.wallet);
      setShowTransfer(false);
      setTransferForm({ fromMethod: "", toMethod: "", amount: "" });
      showToast("success", data.message);
      fetchWallet(true);
      fetchReport();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  // ── Copy Transaction ID ───────────────────────────────────────────────────

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Pagination & Filtering ───────────────────────────────────────────────

  const filteredTx = useMemo(() => {
    let filtered = report?.transactions ?? [];

    if (typeFilter !== "all") {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (walletFilter !== "all") {
      filtered = filtered.filter(t => t.source === walletFilter || t.destination === walletFilter);
    }

    return filtered;
  }, [report?.transactions, typeFilter, walletFilter]);

  const totalPages = Math.ceil(filteredTx.length / ITEMS_PER_PAGE);
  const paginatedTx = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTx.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTx, currentPage]);

  const transferTx = report?.transactions?.filter(t => t.type === "transfer") ?? [];

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-b-2 border-green-700 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading wallet…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #wallet-print-area, #wallet-print-area * { visibility: visible; }
          #wallet-print-area { position: absolute; inset: 0; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="p-6 space-y-6">
        {/* Toast */}
        {toast.type && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}>
            {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center no-print">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              <WalletIcon className="w-8 h-8 text-green-700" />
              Wallet & Cash Flow
            </h1>
            <p className="mt-1 text-sm text-gray-500">Add funds to wallets first · balances update automatically</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { fetchWallet(); fetchReport(); }} className="gap-2 rounded-xl">
              <RefreshCcw className="w-4 h-4" /> Refresh
            </Button>
            <Button variant="outline" onClick={() => setShowTransfer(true)} className="gap-2 text-indigo-600 border-indigo-200 rounded-xl hover:bg-indigo-50">
              <ArrowLeftRight className="w-4 h-4" /> Transfer
            </Button>
            <Button onClick={() => setShowAdd(true)} className="gap-2 bg-green-700 hover:bg-green-800 rounded-xl">
              <Plus className="w-4 h-4" /> Add Money
            </Button>
            <Button onClick={handlePrint} variant="outline" className="gap-2 border-gray-300 rounded-xl">
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </div>

        {/* ── Live Wallet Balances (always shown) ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-6 text-white border-0 shadow-md bg-gradient-to-br from-gray-900 to-gray-700">
            <p className="mb-1 text-xs font-bold tracking-widest text-gray-400 uppercase">Total Liquidity</p>
            <p className="text-4xl font-black">Rs. {(wallet?.totalBalance ?? 0).toLocaleString()}</p>
            <p className="mt-2 text-xs text-gray-400">Combined across all 4 wallets</p>
          </Card>
          <Card className="p-6 border-0 border-l-4 shadow-sm bg-emerald-50 border-l-emerald-500">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Total Income</p>
            </div>
            <p className="text-2xl font-black text-emerald-700">Rs. {(report?.summary.totalIncome ?? 0).toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-400">{periodLabel}</p>
          </Card>
          <Card className="p-6 border-0 border-l-4 shadow-sm bg-red-50 border-l-red-500">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Total Expenses</p>
            </div>
            <p className="text-2xl font-black text-red-700">Rs. {(report?.summary.totalExpenses ?? 0).toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-400">{periodLabel}</p>
          </Card>
        </div>

        {/* ── Wallet cards ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {WALLETS.map((w) => {
            const balance = (wallet?.[w.key] as number) ?? 0;
            const pct = (wallet?.totalBalance ?? 0) > 0 ? Math.round((balance / wallet!.totalBalance) * 100) : 0;
            const Icon = w.icon;
            const isEmpty = balance === 0;
            return (
              <Card key={w.key} className={`p-5 border-2 shadow-sm overflow-hidden relative flex flex-col ${isEmpty ? "border-gray-200" : w.border}`}>
                <div className={`absolute top-3 right-3 w-9 h-9 ${w.color} rounded-xl flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">{w.label}</p>
                <p className={`text-2xl font-black ${isEmpty ? "text-gray-300" : w.text}`}>Rs. {balance.toLocaleString()}</p>
                {isEmpty && <p className="text-[10px] text-orange-500 font-bold mt-0.5">⚠ No funds — add money</p>}
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${w.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 mb-3">{pct}% of total</p>
                <button
                  onClick={() => { setAddForm({ walletKey: w.key, amount: "", description: "" }); setShowAdd(true); }}
                  className={`no-print mt-auto w-full text-[11px] font-bold py-1.5 rounded-lg border-2 transition-colors ${w.light} ${w.text} border-transparent hover:${w.border}`}
                >
                  + Add Funds
                </button>
              </Card>
            );
          })}
        </div>

        {/* ── Period + Tab Controls ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center no-print">
          {/* Period */}
          <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-xl">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => { setPeriod(p.key); setShowCustom(p.key === "custom"); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.key ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700"}`}
              >
                {p.key === "custom" ? <><Calendar className="inline w-3 h-3 mr-1" />Custom</> : p.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap p-1 bg-gray-100 border border-gray-200 rounded-xl">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "cashflow", label: "Cash Flow", icon: Activity },
              { id: "wallet", label: "By Wallet", icon: PieChart },
              { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as ReportTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === id ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date picker */}
        {showCustom && (
          <div className="flex flex-wrap items-end gap-3 p-4 border border-blue-100 bg-blue-50 rounded-xl no-print">
            <div>
              <label className="block mb-1 text-xs font-bold text-gray-500">FROM</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-bold text-gray-500">TO</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <button onClick={fetchReport} disabled={!dateFrom || !dateTo} className="px-4 py-2 text-sm font-bold text-white transition-colors bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-40">
              Apply Range
            </button>
          </div>
        )}

        {/* ── Report Area ── */}
        {reportLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-b-2 border-green-700 rounded-full animate-spin" />
          </div>
        ) : (
          <div id="wallet-print-area">
            {/* Print header */}
            <div className="hidden mb-6 print:block">
              <h1 className="text-2xl font-black text-gray-900">
                {activeTab === "overview" && "Wallet Overview Report"}
                {activeTab === "cashflow" && "Cash Flow Report"}
                {activeTab === "wallet" && "Per-Wallet Breakdown Report"}
                {activeTab === "transfers" && "Transfer History Report"}
              </h1>
              <p className="text-sm text-gray-500">Period: {periodLabel}</p>
              <p className="text-xs text-gray-400">Generated: {new Date().toLocaleString()}</p>
              <hr className="mt-3 border-gray-200" />
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* Net flow summary */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Net Flow", value: report?.summary.netFlow ?? 0, color: (report?.summary.netFlow ?? 0) >= 0 ? "text-green-700" : "text-red-600", bg: "bg-gray-50" },
                    { label: "Total Income", value: report?.summary.totalIncome ?? 0, color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "Total Expenses", value: report?.summary.totalExpenses ?? 0, color: "text-red-700", bg: "bg-red-50" },
                    { label: "Transactions", value: report?.summary.txCount ?? 0, color: "text-blue-700", bg: "bg-blue-50", isCount: true },
                  ].map((s, i) => (
                    <Card key={i} className={`p-5 border-0 shadow-sm ${s.bg}`}>
                      <p className="mb-1 text-xs font-bold tracking-wide text-gray-400 uppercase">{s.label}</p>
                      <p className={`text-2xl font-black ${s.color}`}>
                        {s.isCount ? s.value : `Rs. ${Math.abs(s.value as number).toLocaleString()}`}
                      </p>
                    </Card>
                  ))}
                </div>

                {/* Category breakdown */}
                <Card className="p-6 border-0 shadow-md">
                  <h3 className="mb-4 font-bold text-gray-900">Category Breakdown</h3>
                  <div className="space-y-3">
                    {(report?.byCategory ?? []).length === 0 ? (
                      <p className="py-6 text-sm italic text-center text-gray-400">No transactions this period</p>
                    ) : (
                      (report?.byCategory ?? []).map((cat, i) => {
                        const s = TX_STYLES[cat.type] || TX_STYLES.income;
                        const max = Math.max(...(report?.byCategory ?? []).map(c => c.amount));
                        return (
                          <div key={i}>
                            <div className="flex justify-between mb-1 text-sm">
                              <span className="flex items-center gap-2 font-medium text-gray-700 capitalize">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.badge}`}>{cat.type}</span>
                                {cat.category.replace(/_/g, " ")}
                              </span>
                              <span className={`font-bold ${s.amount}`}>Rs. {cat.amount.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${cat.type === "income" ? "bg-emerald-400" : cat.type === "expense" ? "bg-red-400" : "bg-indigo-400"}`}
                                style={{ width: `${max > 0 ? (cat.amount / max) * 100 : 0}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* ── CASH FLOW TAB ── */}
            {activeTab === "cashflow" && (
              <Card className="overflow-hidden border-0 shadow-md">
                {/* Header with filters */}
                <div className="px-5 py-4 space-y-3 text-white bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black">Transaction History</h3>
                      <p className="text-xs text-gray-400">Period: {periodLabel} · {filteredTx.length} total</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
                    {/* Type Filter */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/10">
                      {(["all", "income", "expense", "transfer"] as const).map((f) => (
                        <button key={f} onClick={() => { setTypeFilter(f); setCurrentPage(1); }}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold capitalize transition-all ${typeFilter === f ? "bg-white text-gray-900" : "text-gray-300 hover:text-white"}`}>
                          {f}
                        </button>
                      ))}
                    </div>

                    {/* Wallet Filter */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/10">
                      <button onClick={() => { setWalletFilter("all"); setCurrentPage(1); }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold capitalize transition-all ${walletFilter === "all" ? "bg-white text-gray-900" : "text-gray-300 hover:text-white"}`}>
                        All Wallets
                      </button>
                      {WALLETS.map((w) => (
                        <button key={w.key} onClick={() => { setWalletFilter(w.key); setCurrentPage(1); }}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${walletFilter === w.key ? "bg-white text-gray-900" : "text-gray-300 hover:text-white"}`}>
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">ID</th>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">Date</th>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">Details</th>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">Type</th>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">Wallet</th>
                        <th className="px-5 py-3 text-xs font-bold text-right text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedTx.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-sm text-center text-gray-400 py-14">
                            <WalletIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            {filteredTx.length === 0 ? "No transactions match filters." : "No transactions this period."}
                          </td>
                        </tr>
                      ) : (
                        paginatedTx.map((tx) => {
                          const s = TX_STYLES[tx.type] || TX_STYLES.income;
                          const TxIcon = s.icon;
                          const isIdCopied = copiedId === tx._id;
                          return (
                            <tr key={tx._id} className="transition-colors hover:bg-gray-50/60">
                              <td className="px-5 py-3">
                                <button
                                  onClick={() => copyToClipboard(tx._id)}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors group"
                                  title="Click to copy ID"
                                >
                                  <span className="font-mono text-xs font-bold text-gray-600 group-hover:text-gray-700">
                                    {tx._id.slice(0, 8)}...
                                  </span>
                                  <Copy className={`h-3 w-3 transition-colors ${isIdCopied ? "text-green-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                                </button>
                                {isIdCopied && <p className="mt-1 text-xs font-semibold text-green-600">Copied!</p>}
                              </td>
                              <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="px-5 py-3">
                                <p className="font-semibold text-gray-900 capitalize">{tx.category.replace(/_/g, " ")}</p>
                                {tx.description && <p className="text-xs text-gray-400 truncate max-w-[220px]">{tx.description}</p>}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${s.badge}`}>
                                  <TxIcon className="w-3 h-3" />{tx.type}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                                  {tx.source}{tx.destination ? ` → ${tx.destination}` : ""}
                                </span>
                              </td>
                              <td className={`px-5 py-3 text-right font-black ${s.amount}`}>
                                {s.prefix}Rs. {tx.amount.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {paginatedTx.length > 0 && (
                      <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                        <tr>
                          <td colSpan={5} className="px-5 py-3 font-black text-gray-900">TOTAL ({paginatedTx.length} of {filteredTx.length} shown)</td>
                          <td className="px-5 py-3 font-black text-right text-gray-900">
                            Rs. {paginatedTx.reduce((a, t) => a + t.amount, 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50 no-print">
                    <div className="text-sm font-medium text-gray-600">
                      Page <span className="font-bold text-gray-900">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </Button>

                      {/* Page number buttons */}
                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          const isVisible = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                          const isEllipsis = page > 1 && page < totalPages && Math.abs(page - currentPage) > 1;

                          if (isEllipsis && page > currentPage - 1 && page < currentPage + 1) return null;

                          if (!isVisible) return null;

                          if (isEllipsis) {
                            return <span key={page} className="px-2 py-1 text-gray-400">…</span>;
                          }

                          return (
                            <Button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              className={page === currentPage ? "bg-green-700 hover:bg-green-800" : ""}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* ── BY WALLET TAB ── */}
            {activeTab === "wallet" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {WALLETS.map((w) => {
                    const wData = report?.byWallet?.[w.key] ?? { income: 0, expense: 0, transfer: 0, net: 0 };
                    const liveBalance = (wallet?.[w.key] as number) ?? 0;
                    return (
                      <Card key={w.key} className={`p-6 border-2 shadow-sm ${w.border}`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 ${w.color} rounded-xl flex items-center justify-center`}>
                            <w.icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className={`font-black text-lg ${w.text}`}>{w.label}</h3>
                            <p className="text-xs text-gray-400">Live balance: Rs. {liveBalance.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: "Income", value: wData.income, color: "text-emerald-700", bg: "bg-emerald-50" },
                            { label: "Expenses", value: wData.expense, color: "text-red-700", bg: "bg-red-50" },
                            { label: "Transfers", value: wData.transfer, color: "text-indigo-700", bg: "bg-indigo-50" },
                          ].map((row, i) => (
                            <div key={i} className={`flex justify-between items-center px-4 py-2 rounded-lg ${row.bg}`}>
                              <span className="text-sm font-semibold text-gray-600">{row.label}</span>
                              <span className={`font-black ${row.color}`}>Rs. {row.value.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className={`flex justify-between items-center px-4 py-2.5 rounded-xl ${wData.net >= 0 ? "bg-emerald-100" : "bg-red-100"} mt-1`}>
                            <span className="text-sm font-black text-gray-700">Net Flow</span>
                            <span className={`font-black text-base ${wData.net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                              {wData.net >= 0 ? "+" : "−"}Rs. {Math.abs(wData.net).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Summary table */}
                <Card className="overflow-hidden border-0 shadow-md">
                  <div className="px-5 py-3 text-white bg-gray-900">
                    <h3 className="font-bold">Wallet Comparison</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">Wallet</th>
                        <th className="px-5 py-3 text-xs font-bold text-right text-gray-500 uppercase">Income</th>
                        <th className="px-5 py-3 text-xs font-bold text-right text-gray-500 uppercase">Expenses</th>
                        <th className="px-5 py-3 text-xs font-bold text-right text-gray-500 uppercase">Net Flow</th>
                        <th className="px-5 py-3 text-xs font-bold text-right text-gray-500 uppercase">Live Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {WALLETS.map((w) => {
                        const wData = report?.byWallet?.[w.key] ?? { income: 0, expense: 0, transfer: 0, net: 0 };
                        const liveBalance = (wallet?.[w.key] as number) ?? 0;
                        return (
                          <tr key={w.key} className="hover:bg-gray-50/50">
                            <td className="flex items-center gap-2 px-5 py-3 font-semibold text-gray-700">
                              <span className={`w-2 h-2 rounded-full ${w.color}`} />{w.label}
                            </td>
                            <td className="px-5 py-3 font-bold text-right text-emerald-700">Rs. {wData.income.toLocaleString()}</td>
                            <td className="px-5 py-3 font-bold text-right text-red-600">Rs. {wData.expense.toLocaleString()}</td>
                            <td className={`px-5 py-3 text-right font-bold ${wData.net >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                              {wData.net >= 0 ? "+" : "−"}Rs. {Math.abs(wData.net).toLocaleString()}
                            </td>
                            <td className={`px-5 py-3 text-right font-black ${w.text}`}>Rs. {liveBalance.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                      <tr>
                        <td className="px-5 py-3 font-black text-gray-900">TOTAL</td>
                        <td className="px-5 py-3 font-black text-right text-emerald-700">Rs. {(report?.summary.totalIncome ?? 0).toLocaleString()}</td>
                        <td className="px-5 py-3 font-black text-right text-red-600">Rs. {(report?.summary.totalExpenses ?? 0).toLocaleString()}</td>
                        <td className={`px-5 py-3 text-right font-black ${(report?.summary.netFlow ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {(report?.summary.netFlow ?? 0) >= 0 ? "+" : "−"}Rs. {Math.abs(report?.summary.netFlow ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 font-black text-right text-gray-900">Rs. {(wallet?.totalBalance ?? 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </Card>
              </div>
            )}

            {/* ── TRANSFERS TAB ── */}
            {activeTab === "transfers" && (
              <Card className="overflow-hidden border-0 shadow-md">
                <div className="flex items-center justify-between px-5 py-4 text-white bg-indigo-700">
                  <div>
                    <h3 className="font-black">Transfer History</h3>
                    <p className="text-xs text-indigo-200">Period: {periodLabel} · {transferTx.length} transfers</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">ID</th>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">Date</th>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">From</th>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">To</th>
                        <th className="px-5 py-3 text-xs font-bold text-left text-gray-500 uppercase">Description</th>
                        <th className="px-5 py-3 text-xs font-bold text-right text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transferTx.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-sm text-center text-gray-400 py-14">
                            <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            No transfers this period.
                          </td>
                        </tr>
                      ) : (
                        transferTx.map((tx) => {
                          const fromW = WALLETS.find(w => w.key === tx.source);
                          const toW = WALLETS.find(w => w.key === tx.destination);
                          const isIdCopied = copiedId === tx._id;
                          return (
                            <tr key={tx._id} className="transition-colors hover:bg-indigo-50/40">
                              <td className="px-5 py-3">
                                <button
                                  onClick={() => copyToClipboard(tx._id)}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors group"
                                  title="Click to copy ID"
                                >
                                  <span className="font-mono text-xs font-bold text-gray-600 group-hover:text-gray-700">
                                    {tx._id.slice(0, 8)}...
                                  </span>
                                  <Copy className={`h-3 w-3 transition-colors ${isIdCopied ? "text-green-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                                </button>
                                {isIdCopied && <p className="mt-1 text-xs font-semibold text-green-600">Copied!</p>}
                              </td>
                              <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${fromW?.light ?? "bg-gray-100"} ${fromW?.text ?? "text-gray-700"}`}>
                                  {fromW && <fromW.icon className="w-3 h-3" />}{tx.source}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${toW?.light ?? "bg-gray-100"} ${toW?.text ?? "text-gray-700"}`}>
                                  {toW && <toW.icon className="w-3 h-3" />}{tx.destination}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-xs text-gray-500">{tx.description || "—"}</td>
                              <td className="px-5 py-3 font-black text-right text-indigo-700">Rs. {tx.amount.toLocaleString()}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {transferTx.length > 0 && (
                      <tfoot className="border-t-2 border-indigo-100 bg-indigo-50">
                        <tr>
                          <td colSpan={5} className="px-5 py-3 font-black text-gray-900">TOTAL TRANSFERRED</td>
                          <td className="px-5 py-3 font-black text-right text-indigo-700">
                            Rs. {transferTx.reduce((a, t) => a + t.amount, 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Add Money Dialog ── */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" /> Add Money to Wallet
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-4">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Select Wallet</label>
                <div className="grid grid-cols-2 gap-2">
                  {WALLETS.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button key={w.key} type="button" onClick={() => setAddForm({ ...addForm, walletKey: w.key })}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${addForm.walletKey === w.key ? `border-green-600 ${w.light} ${w.text}` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        <Icon className="w-4 h-4" /> {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-gray-700">Amount (Rs)</label>
                <Input type="number" placeholder="0" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} className="text-lg font-bold rounded-xl" autoFocus />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-gray-700">Description <span className="font-normal text-gray-400">(optional)</span></label>
                <Input placeholder="e.g. Initial capital, bank deposit…" value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} className="rounded-xl" />
              </div>
              {wallet && addForm.amount && parseFloat(addForm.amount) > 0 && (
                <div className="px-4 py-3 space-y-1 text-sm border border-green-100 bg-green-50 rounded-xl">
                  <div className="flex justify-between text-gray-500">
                    <span>Current {addForm.walletKey} balance</span>
                    <span className="font-bold text-gray-700">Rs. {((wallet[addForm.walletKey] as number) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">After deposit</span>
                    <span className="font-black text-green-700">Rs. {(((wallet[addForm.walletKey] as number) || 0) + parseFloat(addForm.amount)).toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleAddMoney} disabled={addLoading} className="flex-1 bg-green-700 hover:bg-green-800 rounded-xl">
                  {addLoading ? "Adding…" : "Add Funds"}
                </Button>
                <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Transfer Dialog ── */}
        <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-600" /> Transfer Between Wallets
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold text-gray-700">From</label>
                <select value={transferForm.fromMethod} onChange={(e) => setTransferForm({ ...transferForm, fromMethod: e.target.value as WalletKey })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select source wallet…</option>
                  {WALLETS.map((w) => (
                    <option key={w.key} value={w.key}>{w.label} — Rs. {((wallet?.[w.key] as number) ?? 0).toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-gray-700">To</label>
                <select value={transferForm.toMethod} onChange={(e) => setTransferForm({ ...transferForm, toMethod: e.target.value as WalletKey })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select destination wallet…</option>
                  {WALLETS.map((w) => (
                    <option key={w.key} value={w.key} disabled={w.key === transferForm.fromMethod}>{w.label} — Rs. {((wallet?.[w.key] as number) ?? 0).toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold text-gray-700">Amount (Rs)</label>
                <Input type="number" placeholder="0" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} className="text-lg font-bold rounded-xl" />
                {transferForm.fromMethod && wallet && transferForm.amount && (
                  <p className={`text-xs mt-1.5 font-semibold ${parseFloat(transferForm.amount) > ((wallet[transferForm.fromMethod as WalletKey] as number) || 0) ? "text-red-500" : "text-green-600"}`}>
                    {parseFloat(transferForm.amount) > ((wallet[transferForm.fromMethod as WalletKey] as number) || 0)
                      ? `⚠ Insufficient — available: Rs. ${((wallet[transferForm.fromMethod as WalletKey] as number) || 0).toLocaleString()}`
                      : `✓ Available: Rs. ${((wallet[transferForm.fromMethod as WalletKey] as number) || 0).toLocaleString()}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleTransfer} disabled={transferLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                  {transferLoading ? "Processing…" : "Execute Transfer"}
                </Button>
                <Button variant="outline" onClick={() => setShowTransfer(false)} className="flex-1 rounded-xl">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}