// app/admin/wallet/page.tsx (UPDATED WITH FIXED CALCULATIONS)
// ═════════════════════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Banknote,
  CreditCard,
  Smartphone,
  Plus,
  RotateCw,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

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
  source?: string;
  destination?: string;
  wallet?: string;
  description: string;
  createdAt: string;
}

interface Stats {
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
}

type Period = "daily" | "weekly" | "monthly" | "yearly";
type TxnType = "all" | "income" | "expense" | "transfer";

const Rs = (n: number) => `Rs. ${(n ?? 0).toLocaleString()}`;

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [period, setPeriod] = useState<Period>("monthly");
  const [txnType, setTxnType] = useState<TxnType>("all");
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);

  // Transfer form
  const [transferAmount, setTransferAmount] = useState("");
  const [fromWallet, setFromWallet] = useState("cash");
  const [toWallet, setToWallet] = useState("bank");
  const [transferLoading, setTransferLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Deposit form
  const [depositAmount, setDepositAmount] = useState("");
  const [depositWallet, setDepositWallet] = useState("cash");
  const [depositDesc, setDepositDesc] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);

  const loadWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = txnType === "all" ? "" : txnType;
      const url = `/api/admin/wallet?period=${period}${typeParam ? `&type=${typeParam}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load wallet");

      setWallet(data.wallet);
      setTransactions(data.transactions || []);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [period, txnType]);

  const handleTransfer = async () => {
    if (!transferAmount || Number(transferAmount) <= 0) {
      setMessage({ type: "error", text: "Enter a valid amount" });
      return;
    }

    setTransferLoading(true);
    try {
      const res = await fetch("/api/admin/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(transferAmount),
          fromMethod: fromWallet,
          toMethod: toWallet,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: "success", text: data.message });
      setTransferAmount("");
      setShowTransfer(false);
      await loadWallet();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      setMessage({ type: "error", text: "Enter a valid amount" });
      return;
    }

    setDepositLoading(true);
    try {
      const res = await fetch("/api/admin/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletKey: depositWallet,
          amount: Number(depositAmount),
          description: depositDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: "success", text: data.message });
      setDepositAmount("");
      setDepositDesc("");
      setShowDeposit(false);
      await loadWallet();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDepositLoading(false);
    }
  };

  const getTotalForDisplay = (): number => {
    if (!stats) return 0;
    if (txnType === "income") return stats.totalIncome;
    if (txnType === "expense") return stats.totalExpense;
    if (txnType === "transfer") return stats.totalTransfer;
    // For "all", don't sum them together - show breakdown instead
    return 0;
  };

  const typeConfig: Record<TxnType, { color: string; icon: React.ReactNode; label: string }> = {
    all: { color: "bg-gray-100 text-gray-700", icon: <WalletIcon className="w-4 h-4" />, label: "All" },
    income: { color: "bg-green-100 text-green-700", icon: <ArrowDownLeft className="w-4 h-4" />, label: "Income" },
    expense: { color: "bg-red-100 text-red-700", icon: <ArrowUpRight className="w-4 h-4" />, label: "Expense" },
    transfer: { color: "bg-blue-100 text-blue-700", icon: <ArrowRightLeft className="w-4 h-4" />, label: "Transfer" },
  };

  const walletIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    cash: { icon: <Banknote className="w-5 h-5" />, color: "text-green-600" },
    bank: { icon: <CreditCard className="w-5 h-5" />, color: "text-blue-600" },
    easyPaisa: { icon: <Smartphone className="w-5 h-5" />, color: "text-purple-600" },
    jazzCash: { icon: <Smartphone className="w-5 h-5" />, color: "text-orange-600" },
  };

  if (loading && !wallet) {
    return (
      <div className="flex items-center justify-center text-gray-500 h-96">
        Loading wallet...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900">💰 Wallet Manager</h1>
          <p className="mt-2 text-sm text-gray-500">Manage liquidity across all payment methods</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDeposit(true)}
            className="text-white bg-green-600 hover:bg-green-700 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Deposit
          </Button>
          <Button
            onClick={() => setShowTransfer(true)}
            className="text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer
          </Button>
          <Button onClick={loadWallet} variant="outline" className="rounded-xl">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 text-red-700 border border-red-100 bg-red-50 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Success/Error Toast */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-100 text-green-700"
              : "bg-red-50 border border-red-100 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Total Liquidity Card */}
      {wallet && (
        <div className="p-8 text-white shadow-lg rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800">
          <p className="mb-2 text-sm font-bold text-gray-400 uppercase">Total Liquidity</p>
          <p className="mb-6 text-5xl font-black">{Rs(wallet.totalBalance)}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Cash", value: wallet.cash, key: "cash" },
              { label: "Bank", value: wallet.bank, key: "bank" },
              { label: "EasyPaisa", value: wallet.easyPaisa, key: "easyPaisa" },
              { label: "JazzCash", value: wallet.jazzCash, key: "jazzCash" },
            ].map((w) => (
              <div key={w.key} className="px-3 py-2 rounded-lg bg-white/10">
                <p className="flex items-center gap-1 mb-1 text-xs font-semibold">
                  {walletIcons[w.key].icon} {w.label}
                </p>
                <p className="font-bold text-white">{Rs(w.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period & Type Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                period === p ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "income", "expense", "transfer"] as const).map((type) => {
          const config = typeConfig[type];
          const count =
            type === "all"
              ? stats?.totalTransactions
              : type === "income"
                ? stats?.incomeCount
                : type === "expense"
                  ? stats?.expenseCount
                  : stats?.transferCount;

          return (
            <button
              key={type}
              onClick={() => setTxnType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                txnType === type
                  ? `${config.color} ring-2 ring-offset-2 ring-gray-900`
                  : `bg-white border border-gray-200 text-gray-600 hover:text-gray-900`
              }`}
            >
              {config.icon}
              {config.label} {count && <span className="ml-1 font-black">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Transaction Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {txnType === "all" ? (
            <>
              {/* Show breakdown for "all" instead of single sum */}
              <Card className="p-6 bg-white border-0 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Income</p>
                  <ArrowDownLeft className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-black text-green-700">{Rs(stats.totalIncome)}</p>
                <p className="mt-1 text-xs text-gray-500">{stats.incomeCount} transactions</p>
              </Card>
              <Card className="p-6 bg-white border-0 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Expense</p>
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-3xl font-black text-red-700">{Rs(stats.totalExpense)}</p>
                <p className="mt-1 text-xs text-gray-500">{stats.expenseCount} transactions</p>
              </Card>
              <Card className="p-6 bg-white border-0 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Transfers</p>
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-black text-blue-700">{Rs(stats.totalTransfer)}</p>
                <p className="mt-1 text-xs text-gray-500">{stats.transferCount} transactions</p>
              </Card>
            </>
          ) : (
            <>
              {/* Show single stat for filtered view */}
              <Card className="p-6 bg-white border-0 shadow-md md:col-span-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Total {typeConfig[txnType].label}
                  </p>
                  {typeConfig[txnType].icon}
                </div>
                <p className={`text-4xl font-black ${typeConfig[txnType].color}`}>
                  {Rs(getTotalForDisplay())}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {txnType === "income" && `${stats.incomeCount} income transactions`}
                  {txnType === "expense" && `${stats.expenseCount} expense transactions`}
                  {txnType === "transfer" && `${stats.transferCount} transfers`}
                </p>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Transactions Table */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-900">Transaction History</h3>
          <span className="text-xs font-semibold text-gray-500">
            {transactions.length} shown
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                {["Date", "Details", "Type", "Wallet", "Amount", "Balance"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-xs font-bold text-left text-gray-600 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length > 0 ? (
                transactions.map((txn) => {
                  const typeConfig = {
                    income: { color: "text-green-600", label: "Income", icon: "↓" },
                    expense: { color: "text-red-600", label: "Expense", icon: "↑" },
                    transfer: { color: "text-blue-600", label: "Transfer", icon: "→" },
                  };

                  const config = typeConfig[txn.type];

                  return (
                    <tr key={txn._id} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(txn.createdAt).toLocaleDateString("en-PK")}
                      </td>
                      <td className="max-w-xs px-6 py-4 text-sm text-gray-800 truncate">
                        {txn.description}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-mono text-gray-600 capitalize">
                          {txn.wallet || txn.source}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-bold ${config.color}`}>
                        {config.icon} {Rs(txn.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">—</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-sm text-center text-gray-400">
                    No transactions found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md p-6 bg-white rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-gray-900">Transfer Money</h2>
              <button
                onClick={() => setShowTransfer(false)}
                className="p-2 transition-colors rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-xs font-bold text-gray-600">From Wallet</label>
                <select
                  value={fromWallet}
                  onChange={(e) => setFromWallet(e.target.value)}
                  className="w-full px-3 py-2 font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {wallet && (
                    <>
                      <option value="cash">Cash - {Rs(wallet.cash)}</option>
                      <option value="bank">Bank - {Rs(wallet.bank)}</option>
                      <option value="easyPaisa">EasyPaisa - {Rs(wallet.easyPaisa)}</option>
                      <option value="jazzCash">JazzCash - {Rs(wallet.jazzCash)}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-xs font-bold text-gray-600">To Wallet</label>
                <select
                  value={toWallet}
                  onChange={(e) => setToWallet(e.target.value)}
                  className="w-full px-3 py-2 font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="easyPaisa">EasyPaisa</option>
                  <option value="jazzCash">JazzCash</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-xs font-bold text-gray-600">Amount</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-lg font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowTransfer(false)}
                  variant="outline"
                  className="flex-1 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTransfer}
                  disabled={transferLoading}
                  className="flex-1 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {transferLoading ? "Transferring..." : "Transfer"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md p-6 bg-white rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-gray-900">Add Money</h2>
              <button
                onClick={() => setShowDeposit(false)}
                className="p-2 transition-colors rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-xs font-bold text-gray-600">Wallet</label>
                <select
                  value={depositWallet}
                  onChange={(e) => setDepositWallet(e.target.value)}
                  className="w-full px-3 py-2 font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="easyPaisa">EasyPaisa</option>
                  <option value="jazzCash">JazzCash</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-xs font-bold text-gray-600">Amount</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-lg font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-2 text-xs font-bold text-gray-600">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={depositDesc}
                  onChange={(e) => setDepositDesc(e.target.value)}
                  placeholder="e.g., Bank deposit, Cash collected..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowDeposit(false)}
                  variant="outline"
                  className="flex-1 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeposit}
                  disabled={depositLoading}
                  className="flex-1 text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  {depositLoading ? "Adding..." : "Add Money"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}