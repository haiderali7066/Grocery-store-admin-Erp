"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { 
  AlertTriangle, Loader2, TrendingUp, TrendingDown, 
  Wallet, ShoppingBag, Receipt, Package, RefreshCcw 
} from "lucide-react";

export default function ProfitLossPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?period=${period}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load reports");
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) return <LoadingScreen />;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">
            Analytics <span className="text-blue-600">.</span>
          </h1>
          <p className="text-slate-500 font-medium">Financial health & performance overview</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {["daily", "weekly", "monthly"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                period === p ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p}
            </button>
          ))}
          <button onClick={fetchData} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          title="Total Revenue"
          icon={<ShoppingBag size={18} />}
          value={data?.stats?.totalRevenue}
          sub={`Online: Rs. ${data?.breakdown?.online?.toLocaleString()}`}
          color="blue"
        />
        <StatBox
          title="Net Profit"
          icon={data?.stats?.netProfit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          value={data?.stats?.netProfit}
          sub={`${data?.stats?.margins?.net?.toFixed(1)}% Net Margin`}
          color={data?.stats?.netProfit >= 0 ? "green" : "red"}
        />
        <StatBox
          title="Total Expenses"
          icon={<Receipt size={18} />}
          value={data?.stats?.totalExpenses}
          sub={`${data?.breakdown?.expenses?.length} Categories`}
          color="amber"
        />
        <StatBox
          title="Inventory Value"
          icon={<Package size={18} />}
          value={data?.stats?.inventoryValue}
          sub="Current Asset Stock"
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Breakdown */}
        <Card className="lg:col-span-1 p-6 border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-slate-400" /> Expense Breakdown
          </h3>
          <div className="space-y-4">
            {data?.breakdown?.expenses?.map((ex: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-600">{ex.category}</span>
                  <span className="font-bold text-slate-900">Rs. {ex.amount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full rounded-full" 
                    style={{ width: `${(ex.amount / data.stats.totalExpenses) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {(!data?.breakdown?.expenses || data?.breakdown?.expenses.length === 0) && (
              <p className="text-center py-8 text-slate-400 italic text-sm">No expenses recorded for this period.</p>
            )}
          </div>
        </Card>

        {/* Profitability Indicator */}
        <Card className="lg:col-span-2 p-6 border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-center">
            <div className="text-center space-y-2">
                <p className="text-slate-500 font-medium">Gross Profit Margin</p>
                <h2 className="text-6xl font-black text-slate-900">
                    {data?.stats?.margins?.gross?.toFixed(1)}%
                </h2>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    This represents your profit after Cost of Goods Sold but before operational expenses.
                </p>
            </div>
        </Card>
      </div>

      {error && <ErrorAlert error={error} />}
    </div>
  );
}

// --- Sub-components ---

function StatBox({ title, value, sub, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };

  return (
    <Card className="p-6 border-slate-100 shadow-lg shadow-slate-200/40 hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg border ${colors[color]}`}>{icon}</div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <p className="text-2xl font-black text-slate-900">
        Rs. {(value ?? 0).toLocaleString()}
      </p>
      <p className="text-xs mt-2 text-slate-500 font-medium">{sub}</p>
    </Card>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-slate-50">
      <div className="relative">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <div className="absolute inset-0 blur-xl bg-blue-400/20 animate-pulse"></div>
      </div>
      <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">Analyzing Financials...</p>
    </div>
  );
}

function ErrorAlert({ error }: { error: string }) {
  return (
    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
      <AlertTriangle size={20} />
      <p className="text-sm font-medium">{error}</p>
    </div>
  );
}