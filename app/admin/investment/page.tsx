"use client";
// FILE PATH: app/admin/investment/page.tsx

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, MinusCircle, DollarSign, TrendingUp, Wallet,
  AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Investment {
  _id: string;
  amount: number;
  source: string;
  remainingBalance: number;
  status: "active" | "exhausted";
  investmentDate: string;
  description: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Summary {
  totalInvestment:  number;
  remainingBalance: number;
  investments:      Investment[];
  pagination:       Pagination;
}

// No "card" — only these four
const SOURCES = [
  { value: "cash",      label: "Cash"      },
  { value: "bank",      label: "Bank"      },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "jazzcash",  label: "JazzCash"  },
];

const Rs = (n: number) => `Rs. ${(n ?? 0).toLocaleString()}`;

// ── Pagination widget ─────────────────────────────────────────────────────────

function Pages({ cur, total, set }: { cur: number; total: number; set: (p: number) => void }) {
  if (total <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - cur) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
      <span className="text-sm text-gray-500">
        Page <strong>{cur}</strong> of <strong>{total}</strong>
      </span>
      <div className="flex gap-1">
        <button onClick={() => set(cur - 1)} disabled={cur === 1}
          className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 py-1 text-gray-400 self-center">…</span>
          ) : (
            <button key={p} onClick={() => set(p as number)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                p === cur ? "bg-green-700 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => set(cur + 1)} disabled={cur === total}
          className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InvestmentPage() {
  const [data, setData] = useState<Summary>({
    totalInvestment:  0,
    remainingBalance: 0,
    investments:      [],
    pagination:       { page: 1, limit: 50, total: 0, totalPages: 1 },
  });
  const [page,      setPage]      = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Add dialog
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState({ amount: "", source: "cash", description: "" });
  const [addLoading, setAddLoading] = useState(false);

  // Withdraw dialog
  const [showWithdraw,    setShowWithdraw]    = useState(false);
  const [withdrawForm,    setWithdrawForm]    = useState({
    investmentId: "", amount: "", reason: "", destination: "cash",
  });
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError,   setWithdrawError]   = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (p = page) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/investment?page=${p}&limit=50`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(page); }, [page]);

  // ── Add ──────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) {
      alert("Enter a valid amount"); return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:      parseFloat(addForm.amount),
          source:      addForm.source,
          description: addForm.description,
        }),
      });
      if (res.ok) {
        setAddForm({ amount: "", source: "cash", description: "" });
        setShowAdd(false);
        setPage(1);
        fetchData(1);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to add investment");
      }
    } catch { alert("Request failed"); }
    finally { setAddLoading(false); }
  };

  // ── Withdraw ─────────────────────────────────────────────────────────────

  const handleWithdraw = async () => {
    setWithdrawError("");
    const amount = parseFloat(withdrawForm.amount);

    if (!withdrawForm.investmentId) { setWithdrawError("Select an investment to withdraw from"); return; }
    if (!amount || amount <= 0)      { setWithdrawError("Enter a valid withdrawal amount"); return; }
    if (!withdrawForm.destination)   { setWithdrawError("Select a destination wallet"); return; }

    const inv = data.investments.find(i => i._id === withdrawForm.investmentId);
    if (inv && amount > inv.remainingBalance) {
      setWithdrawError(`Max available: ${Rs(inv.remainingBalance)}`); return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetch("/api/admin/investment/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investmentId: withdrawForm.investmentId,
          amount,
          reason:       withdrawForm.reason,
          destination:  withdrawForm.destination,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        alert(`✅ ${d.message}`);
        setWithdrawForm({ investmentId: "", amount: "", reason: "", destination: "cash" });
        setShowWithdraw(false);
        fetchData(page);
      } else {
        setWithdrawError(d.error || "Withdrawal failed");
      }
    } catch { setWithdrawError("Request failed"); }
    finally { setWithdrawLoading(false); }
  };

  const selectedInv = data.investments.find(i => i._id === withdrawForm.investmentId);
  const usedAmount  = data.totalInvestment - data.remainingBalance;

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investment & Capital</h1>
          <p className="text-gray-500 text-sm mt-1">Track business investment and capital flows</p>
        </div>
        <div className="flex gap-2">

          {/* ── Withdraw dialog ── */}
          <Dialog open={showWithdraw} onOpenChange={o => { setShowWithdraw(o); setWithdrawError(""); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50">
                <MinusCircle className="h-4 w-4" /> Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Withdraw from Investment</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">

                {/* Select investment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Investment *</label>
                  <select
                    value={withdrawForm.investmentId}
                    onChange={e => setWithdrawForm({ ...withdrawForm, investmentId: e.target.value, amount: "" })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Choose investment…</option>
                    {data.investments.filter(i => i.remainingBalance > 0).map(i => (
                      <option key={i._id} value={i._id}>
                        {i.description || `${i.source} investment`} — {Rs(i.remainingBalance)} available
                      </option>
                    ))}
                  </select>
                </div>

                {selectedInv && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm">
                    <p className="font-semibold text-orange-800">Available: {Rs(selectedInv.remainingBalance)}</p>
                    <p className="text-orange-600 text-xs mt-0.5">
                      Original: {Rs(selectedInv.amount)} from {selectedInv.source}
                    </p>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Withdraw Amount (Rs) *</label>
                  <Input
                    type="number" placeholder="0"
                    value={withdrawForm.amount}
                    onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    max={selectedInv?.remainingBalance}
                    className="rounded-xl"
                  />
                </div>

                {/* Destination wallet — REQUIRED */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Return to Wallet <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={withdrawForm.destination}
                    onChange={e => setWithdrawForm({ ...withdrawForm, destination: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select wallet…</option>
                    {SOURCES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Funds will be added to this wallet bucket</p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
                  <Input
                    placeholder="Reason for withdrawal…"
                    value={withdrawForm.reason}
                    onChange={e => setWithdrawForm({ ...withdrawForm, reason: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                {withdrawError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />{withdrawError}
                  </div>
                )}

                <Button onClick={handleWithdraw} disabled={withdrawLoading || !withdrawForm.destination}
                  className="w-full bg-orange-600 hover:bg-orange-700 rounded-xl disabled:opacity-50">
                  {withdrawLoading ? "Processing…" : "Confirm Withdrawal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Add Investment dialog ── */}
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-green-700 hover:bg-green-800 rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Add Investment
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Add Investment</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (Rs) *</label>
                  <Input type="number" value={addForm.amount}
                    onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
                    placeholder="0" className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Source Wallet *</label>
                  <select value={addForm.source}
                    onChange={e => setAddForm({ ...addForm, source: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <Input value={addForm.description}
                    onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                    placeholder="Initial capital, additional funds…" className="rounded-xl" />
                </div>
                <Button onClick={handleAdd} disabled={addLoading}
                  className="w-full bg-green-700 hover:bg-green-800 rounded-xl">
                  {addLoading ? "Adding…" : "Add Investment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 border-0 shadow-md bg-blue-50">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium text-gray-600">Total Invested</p>
          </div>
          <p className="text-3xl font-black text-blue-600">{Rs(data.totalInvestment)}</p>
        </Card>
        <Card className="p-6 border-0 shadow-md bg-green-50">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-gray-600">Available Balance</p>
          </div>
          <p className="text-3xl font-black text-green-600">{Rs(data.remainingBalance)}</p>
        </Card>
        <Card className="p-6 border-0 shadow-md bg-orange-50">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            <p className="text-sm font-medium text-gray-600">Used / Withdrawn</p>
          </div>
          <p className="text-3xl font-black text-orange-600">{Rs(usedAmount)}</p>
        </Card>
      </div>

      {/* History */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Investment History</h2>
          {data.pagination.total > 0 && (
            <span className="text-xs text-gray-400 font-medium">
              {data.pagination.total} records · page {data.pagination.page} of {data.pagination.totalPages}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-700" />
          </div>
        ) : data.investments.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">No investments recorded</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.investments.map(inv => {
              const pct = inv.amount > 0 ? Math.round((inv.remainingBalance / inv.amount) * 100) : 0;
              const sourceLabel = SOURCES.find(s => s.value === inv.source?.toLowerCase())?.label || inv.source;
              return (
                <div key={inv._id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${inv.status === "exhausted" ? "bg-red-50" : "bg-blue-50"}`}>
                        <DollarSign className={`h-4 w-4 ${inv.status === "exhausted" ? "text-red-400" : "text-blue-600"}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {inv.description || "Investment"}
                          {inv.status === "exhausted" && (
                            <span className="ml-2 text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">exhausted</span>
                          )}
                        </p>
                        <p className="text-sm text-green-600">
                          {sourceLabel} · {new Date(inv.investmentDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900">{Rs(inv.amount)}</p>
                      <p className="text-xs text-gray-500">Remaining: {Rs(inv.remainingBalance)}</p>
                    </div>
                  </div>
                  <div className="ml-12">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 50 ? "bg-green-500" : pct > 20 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{pct}% remaining</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pages
          cur={data.pagination.page}
          total={data.pagination.totalPages}
          set={p => setPage(p)}
        />
      </Card>
    </div>
  );
}