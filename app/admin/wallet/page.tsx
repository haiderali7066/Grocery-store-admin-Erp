"use client";

import { useEffect, useState } from "react";
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

type ToastType = "success" | "error" | null;
type WalletKey = "cash" | "bank" | "easyPaisa" | "jazzCash";

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
  {
    key: "cash",
    label: "Cash",
    icon: Banknote,
    color: "bg-emerald-500",
    light: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  {
    key: "bank",
    label: "Bank",
    icon: Landmark,
    color: "bg-blue-500",
    light: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  {
    key: "easyPaisa",
    label: "EasyPaisa",
    icon: Smartphone,
    color: "bg-green-600",
    light: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  {
    key: "jazzCash",
    label: "JazzCash",
    icon: Smartphone,
    color: "bg-red-500",
    light: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
];

const TX_STYLES: Record<
  string,
  { badge: string; amount: string; icon: React.ElementType; prefix: string }
> = {
  income: {
    badge: "bg-emerald-100 text-emerald-700",
    amount: "text-emerald-600",
    icon: ArrowUpCircle,
    prefix: "+",
  },
  expense: {
    badge: "bg-red-100 text-red-700",
    amount: "text-red-600",
    icon: ArrowDownCircle,
    prefix: "−",
  },
  transfer: {
    badge: "bg-indigo-100 text-indigo-700",
    amount: "text-indigo-600",
    icon: Repeat2,
    prefix: "",
  },
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "income" | "expense" | "transfer"
  >("all");

  // Toast
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({
    type: null,
    message: "",
  });
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 3500);
  };

  // Add money dialog
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<{
    walletKey: WalletKey;
    amount: string;
    description: string;
  }>({ walletKey: "cash", amount: "", description: "" });
  const [addLoading, setAddLoading] = useState(false);

  // Transfer dialog
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState<{
    fromMethod: WalletKey | "";
    toMethod: WalletKey | "";
    amount: string;
  }>({ fromMethod: "", toMethod: "", amount: "" });
  const [transferLoading, setTransferLoading] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    fetchWallet();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAddMoney = async () => {
    const amount = parseFloat(addForm.amount);
    if (!amount || amount <= 0) {
      showToast("error", "Enter a valid amount");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletKey: addForm.walletKey,
          amount,
          description: addForm.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWallet(data.wallet);
      setShowAdd(false);
      setAddForm({ walletKey: "cash", amount: "", description: "" });
      showToast(
        "success",
        `Rs. ${amount.toLocaleString()} added to ${addForm.walletKey}`,
      );
      fetchWallet(true);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferForm.amount);
    if (
      !amount ||
      amount <= 0 ||
      !transferForm.fromMethod ||
      !transferForm.toMethod
    ) {
      showToast("error", "Fill all fields");
      return;
    }
    if (transferForm.fromMethod === transferForm.toMethod) {
      showToast("error", "Source and destination must differ");
      return;
    }
    setTransferLoading(true);
    try {
      const res = await fetch("/api/admin/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          fromMethod: transferForm.fromMethod,
          toMethod: transferForm.toMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWallet(data.wallet);
      setShowTransfer(false);
      setTransferForm({ fromMethod: "", toMethod: "", amount: "" });
      showToast("success", data.message);
      fetchWallet(true);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const filteredTx =
    typeFilter === "all"
      ? transactions
      : transactions.filter((t) => t.type === typeFilter);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        <p className="text-sm text-gray-400">Loading wallet…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast.type && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <WalletIcon className="h-8 w-8 text-green-700" />
            Wallet & Cash Flow
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Add funds to wallets first · balances update automatically from
            purchases, expenses & sales
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => fetchWallet()}
            className="gap-2 rounded-xl"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTransfer(true)}
            className="gap-2 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <ArrowLeftRight className="h-4 w-4" /> Transfer
          </Button>
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-green-700 hover:bg-green-800 rounded-xl gap-2"
          >
            <Plus className="h-4 w-4" /> Add Money
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-0 shadow-md bg-gradient-to-br from-gray-900 to-gray-700 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
            Total Liquidity
          </p>
          <p className="text-4xl font-black">
            Rs. {(wallet?.totalBalance ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Combined across all 4 wallets
          </p>
        </Card>
        <Card className="p-6 border-0 shadow-sm bg-emerald-50 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Income (recent 50)
            </p>
          </div>
          <p className="text-2xl font-black text-emerald-700">
            Rs. {totalIncome.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            POS sales + online orders + deposits
          </p>
        </Card>
        <Card className="p-6 border-0 shadow-sm bg-red-50 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Expenses (recent 50)
            </p>
          </div>
          <p className="text-2xl font-black text-red-700">
            Rs. {totalExpenses.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Purchases + expenses + withdrawals
          </p>
        </Card>
      </div>

      {/* Wallet cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {WALLETS.map((w) => {
          const balance = (wallet?.[w.key] as number) ?? 0;
          const pct =
            (wallet?.totalBalance ?? 0) > 0
              ? Math.round((balance / wallet!.totalBalance) * 100)
              : 0;
          const Icon = w.icon;
          const isEmpty = balance === 0;
          return (
            <Card
              key={w.key}
              className={`p-5 border-2 shadow-sm overflow-hidden relative flex flex-col ${isEmpty ? "border-gray-200" : w.border}`}
            >
              <div
                className={`absolute top-3 right-3 w-9 h-9 ${w.color} rounded-xl flex items-center justify-center shadow-sm`}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                {w.label}
              </p>
              <p
                className={`text-2xl font-black ${isEmpty ? "text-gray-300" : w.text}`}
              >
                Rs. {balance.toLocaleString()}
              </p>
              {isEmpty && (
                <p className="text-[10px] text-orange-500 font-bold mt-0.5">
                  ⚠ No funds — add money
                </p>
              )}
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${w.color} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 mb-3">
                {pct}% of total
              </p>
              {/* Per-card add button */}
              <button
                onClick={() => {
                  setAddForm({ walletKey: w.key, amount: "", description: "" });
                  setShowAdd(true);
                }}
                className={`mt-auto w-full text-[11px] font-bold py-1.5 rounded-lg border-2 transition-colors ${w.light} ${w.text} border-transparent hover:${w.border}`}
              >
                + Add Funds
              </button>
            </Card>
          );
        })}
      </div>

      {/* Audit trail */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 flex-wrap gap-3">
          <h3 className="font-bold text-gray-900">
            Audit Trail{" "}
            <span className="text-gray-400 font-normal text-sm">(last 50)</span>
          </h3>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {(["all", "income", "expense", "transfer"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${typeFilter === f ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">
                  Date
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">
                  Details
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">
                  Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">
                  Wallet
                </th>
                <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTx.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-14 text-gray-400 text-sm"
                  >
                    <WalletIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    {transactions.length === 0
                      ? "No transactions yet. Add money to get started."
                      : "No transactions match this filter."}
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => {
                  const s = TX_STYLES[tx.type] || TX_STYLES.income;
                  const TxIcon = s.icon;
                  return (
                    <tr
                      key={tx._id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900 capitalize">
                          {tx.category.replace(/_/g, " ")}
                        </p>
                        {tx.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[220px]">
                            {tx.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${s.badge}`}
                        >
                          <TxIcon className="h-3 w-3" />
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                          {tx.source}
                          {tx.destination ? ` → ${tx.destination}` : ""}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-black ${s.amount}`}
                      >
                        {s.prefix}Rs. {tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Add Money Dialog ── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" /> Add Money to Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Wallet
              </label>
              <div className="grid grid-cols-2 gap-2">
                {WALLETS.map((w) => {
                  const Icon = w.icon;
                  return (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() =>
                        setAddForm({ ...addForm, walletKey: w.key })
                      }
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                        addForm.walletKey === w.key
                          ? `border-green-600 ${w.light} ${w.text}`
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Amount (Rs)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={addForm.amount}
                onChange={(e) =>
                  setAddForm({ ...addForm, amount: e.target.value })
                }
                className="rounded-xl text-lg font-bold"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Initial capital, bank deposit…"
                value={addForm.description}
                onChange={(e) =>
                  setAddForm({ ...addForm, description: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            {/* Balance preview */}
            {wallet && addForm.amount && parseFloat(addForm.amount) > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Current {addForm.walletKey} balance</span>
                  <span className="font-bold text-gray-700">
                    Rs.{" "}
                    {(
                      (wallet[addForm.walletKey] as number) || 0
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">After deposit</span>
                  <span className="font-black text-green-700">
                    Rs.{" "}
                    {(
                      ((wallet[addForm.walletKey] as number) || 0) +
                      parseFloat(addForm.amount)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleAddMoney}
                disabled={addLoading}
                className="flex-1 bg-green-700 hover:bg-green-800 rounded-xl"
              >
                {addLoading ? "Adding…" : "Add Funds"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Transfer Dialog ── */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-indigo-600" /> Transfer
              Between Wallets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                From
              </label>
              <select
                value={transferForm.fromMethod}
                onChange={(e) =>
                  setTransferForm({
                    ...transferForm,
                    fromMethod: e.target.value as WalletKey,
                  })
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select source wallet…</option>
                {WALLETS.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label} — Rs.{" "}
                    {((wallet?.[w.key] as number) ?? 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                To
              </label>
              <select
                value={transferForm.toMethod}
                onChange={(e) =>
                  setTransferForm({
                    ...transferForm,
                    toMethod: e.target.value as WalletKey,
                  })
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select destination wallet…</option>
                {WALLETS.map((w) => (
                  <option
                    key={w.key}
                    value={w.key}
                    disabled={w.key === transferForm.fromMethod}
                  >
                    {w.label} — Rs.{" "}
                    {((wallet?.[w.key] as number) ?? 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Amount (Rs)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={transferForm.amount}
                onChange={(e) =>
                  setTransferForm({ ...transferForm, amount: e.target.value })
                }
                className="rounded-xl text-lg font-bold"
              />
              {transferForm.fromMethod && wallet && transferForm.amount && (
                <p
                  className={`text-xs mt-1.5 font-semibold ${
                    parseFloat(transferForm.amount) >
                    ((wallet[transferForm.fromMethod as WalletKey] as number) ||
                      0)
                      ? "text-red-500"
                      : "text-green-600"
                  }`}
                >
                  {parseFloat(transferForm.amount) >
                  ((wallet[transferForm.fromMethod as WalletKey] as number) ||
                    0)
                    ? `⚠ Insufficient — available: Rs. ${((wallet[transferForm.fromMethod as WalletKey] as number) || 0).toLocaleString()}`
                    : `✓ Available: Rs. ${((wallet[transferForm.fromMethod as WalletKey] as number) || 0).toLocaleString()}`}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTransfer}
                disabled={transferLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                {transferLoading ? "Processing…" : "Execute Transfer"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTransfer(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
