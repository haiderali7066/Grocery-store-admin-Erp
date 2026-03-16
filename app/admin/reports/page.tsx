// FILE PATH: app/admin/reports/page.tsx (UPDATED VERSION)
// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED P&L REPORT UI WITH DETAILED CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle, Loader2, TrendingUp, TrendingDown, ShoppingBag,
  Receipt, Package, RefreshCcw, Store, Globe, BarChart3, FileText,
  Printer, Calendar, ChevronLeft, ChevronRight, Wallet, Info,
  Banknote, CreditCard, Smartphone, Truck, Activity, Zap, Target
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface SaleItem { 
  name: string; sku?: string | null; quantity: number; price: number; subtotal: number;
  costPrice?: number; itemProfit?: number;
}

interface ReportData {
  period: string;
  generatedAt: string;

  stats: {
    totalRevenue: number; onlineRevenue: number; posRevenue: number;
    totalCOGS: number; onlineCOGS: number; posCOGS: number;
    grossProfit: number; netProfit: number;
    totalExpenses: number; deliveryLoss: number;
    inventoryValue: number; inventoryUnits: number;
    walletBalance: number;
    margins: { gross: number; net: number; online: number; pos: number };
    roi: number; cashConversion: number; breakevenRevenue: number; returnRate: number;
  };

  breakdown: {
    revenue: { online: number; pos: number; total: number };
    costOfGoods: { online: number; pos: number; total: number };
    grossProfitByChannel: { online: number; pos: number; total: number };
    expenses: { category: string; amount: number; count: number; avgPerTransaction: number }[];
    deliveryLoss: number;
    refunds: { 
      totalRefunded: number; onlineCount: number; posCount: number; totalCount: number;
      returnRate: string; avgDeliveryLossPerReturn: string;
    };
    orderMetrics: { onlineOrders: number; posTransactions: number; totalTransactions: number };
  };

  profitability: {
    grossProfit: number; grossMargin: number;
    operatingExpenses: number; deliveryLoss: number;
    netProfit: number; netMargin: number;
    breakeven: { requiredRevenue: number; remainingCapacity: number; safetyMargin: number };
  };

  wallet: { cash: number; bank: number; easyPaisa: number; jazzCash: number; totalBalance: number };
  detail?: { onlineOrders: OnlineOrder[]; posSales: POSSale[] };
}

interface OnlineOrder {
  _id: string; orderNumber?: string; subtotal: number; costOfGoods: number;
  profit: number; margin: number; createdAt: string; customerName?: string; orderStatus?: string;
  paymentMethod?: string; items?: SaleItem[];
}

interface POSSale {
  _id: string; saleNumber?: string; cashierName?: string; subtotal: number;
  costOfGoods: number; profit: number; margin: number;
  createdAt: string; paymentMethod?: string; items?: SaleItem[];
}

const PERIODS = ["daily", "weekly", "monthly", "custom"] as const;
type Period = (typeof PERIODS)[number];
type Tab    = "overview" | "pl" | "detailed" | "online" | "pos";
const PER_PAGE = 10;

const Rs   = (n: number) => `Rs. ${Math.abs(n ?? 0).toLocaleString()}`;
const pct  = (n: number) => `${(n ?? 0).toFixed(1)}%`;
const sign = (n: number) => n < 0 ? `− Rs. ${Math.abs(n).toLocaleString()}` : `Rs. ${n.toLocaleString()}`;

// ── Helpers ────────────────────────────────────────────────────────────────

function ItemList({ items, limit = 2 }: { items?: SaleItem[]; limit?: number }) {
  if (!items?.length) return <span className="text-gray-400 text-xs italic">—</span>;
  return (
    <div className="space-y-0.5">
      {items.slice(0, limit).map((it, i) => (
        <div key={i} className="flex items-center gap-1 text-xs">
          <span className="font-medium text-gray-800 truncate max-w-[160px]">{it.name}</span>
          <span className="text-gray-400 shrink-0">×{it.quantity}</span>
        </div>
      ))}
      {items.length > limit && <span className="text-[10px] text-indigo-500 font-semibold">+{items.length - limit} more</span>}
    </div>
  );
}

function Pages({ cur, total, set }: { cur: number; total: number; set: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between no-print">
      <span className="text-sm text-gray-600 font-medium">
        Page <strong className="text-gray-900">{cur}</strong> of <strong className="text-gray-900">{total}</strong>
      </span>
      <div className="flex gap-2">
        <button onClick={() => set(cur - 1)} disabled={cur === 1}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => set(cur + 1)} disabled={cur === total}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data,    setData]    = useState<ReportData | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<Period>("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [tab,        setTab]        = useState<Tab>("overview");
  const [showCustom, setShowCustom] = useState(false);
  const [onlinePg,   setOnlinePg]   = useState(1);
  const [posPg,      setPosPg]      = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let url = `/api/admin/reports?period=${period}&detail=true`;
      if (period === "custom" && dateFrom && dateTo)
        url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const res = await fetch(url);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load reports");
      setData(d); setOnlinePg(1); setPosPg(1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [period, dateFrom, dateTo]);

  useEffect(() => { if (period !== "custom") load(); }, [period]);

  const onlineOrders = useMemo(() => data?.detail?.onlineOrders ?? [], [data]);
  const posSales     = useMemo(() => data?.detail?.posSales     ?? [], [data]);

  const pagedOnline = useMemo(() => { const s = (onlinePg - 1) * PER_PAGE; return onlineOrders.slice(s, s + PER_PAGE); }, [onlineOrders, onlinePg]);
  const pagedPOS    = useMemo(() => { const s = (posPg    - 1) * PER_PAGE; return posSales.slice(s,    s + PER_PAGE); }, [posSales,    posPg]);

  const totalSales = (data?.breakdown.revenue.online ?? 0) + (data?.breakdown.revenue.pos ?? 0);
  const onlinePct  = totalSales > 0 ? ((data?.breakdown.revenue.online ?? 0) / totalSales) * 100 : 0;
  const posPct     = totalSales > 0 ? ((data?.breakdown.revenue.pos    ?? 0) / totalSales) * 100 : 0;

  const isProfit   = (data?.stats.netProfit ?? 0) >= 0;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; inset: 0; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 no-print">
          <div>
            <h1 className="text-4xl font-black text-gray-900">📊 P&L Analytics</h1>
            <p className="text-gray-500 text-sm mt-2">Revenue · COGS · Expenses · Profitability Analysis</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              {PERIODS.map(p => (
                <button key={p} onClick={() => { setPeriod(p); setShowCustom(p === "custom"); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${period === p ? "bg-green-600 shadow-sm text-white" : "text-gray-500 hover:text-gray-700"}`}>
                  {p === "custom" ? <><Calendar className="h-3.5 w-3.5 inline mr-1" />Custom</> : p}
                </button>
              ))}
            </div>
            <button onClick={load} className="p-2 text-gray-400 hover:text-green-600 bg-white border border-gray-200 rounded-xl transition-colors">
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {/* Custom Range */}
        {showCustom && (
          <div className="flex flex-wrap items-end gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 no-print">
            <div><label className="text-xs font-bold text-gray-500 block mb-1">FROM</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
            <div><label className="text-xs font-bold text-gray-500 block mb-1">TO</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
            <button onClick={() => { if (dateFrom && dateTo) load(); }} disabled={!dateFrom || !dateTo}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-40 transition-colors">Apply</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl w-fit no-print border border-gray-200 shadow-sm">
          {([
            { id: "overview", label: "Overview",      Icon: BarChart3 },
            { id: "detailed", label: "Detailed P&L",  Icon: Activity  },
            { id: "pl",       label: "P&L Statement", Icon: FileText  },
            { id: "online",   label: "Online Sales",  Icon: Globe     },
            { id: "pos",      label: "POS Sales",     Icon: Store     },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === id ? "bg-green-600 shadow-sm text-white" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-green-600 h-8 w-8" />
          </div>
        ) : (
          <div id="print-area" ref={printRef}>

            {/* ══════════ OVERVIEW TAB ══════════ */}
            {tab === "overview" && data && (
              <div className="space-y-5">

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <StatCard title="Total Revenue" value={data.stats.totalRevenue} icon={<ShoppingBag className="h-5 w-5" />} color="blue" sub={`${(data.stats.totalRevenue / (data.stats.totalRevenue || 1) * 100).toFixed(0)}% target`} />
                  <StatCard title="Total COGS" value={data.stats.totalCOGS} icon={<Package className="h-5 w-5" />} color="orange" sub={pct(data.stats.margins.gross)} />
                  <StatCard title="Gross Profit" value={data.stats.grossProfit} icon={<TrendingUp className="h-5 w-5" />} color="green" sub={pct(data.stats.margins.gross) + " margin"} />
                  <StatCard title="Net Profit" value={data.stats.netProfit} icon={isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} color={isProfit ? "emerald" : "red"} sub={pct(data.stats.margins.net) + " margin"} />
                  <StatCard title="Inventory" value={data.stats.inventoryValue} icon={<Package className="h-5 w-5" />} color="indigo" sub={`${data.stats.inventoryUnits.toLocaleString()} units`} />
                </div>

                {/* Main P&L Hero Card */}
                <div className={`rounded-2xl p-8 shadow-lg border-2 ${isProfit ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <div className="text-center mb-6">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Net Profit / Loss</p>
                    <p className={`text-6xl font-black ${isProfit ? "text-emerald-700" : "text-red-600"}`}>{sign(data.stats.netProfit)}</p>
                    <p className={`text-sm font-semibold mt-3 ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                      {isProfit ? "▲ IN PROFIT" : "▼ IN LOSS"} · {pct(data.stats.margins.net)} Net Margin
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { l: "Revenue", v: Rs(data.stats.totalRevenue), c: "text-emerald-700", bg: "bg-emerald-100/50" },
                      { l: "COGS", v: `− ${Rs(data.stats.totalCOGS)}`, c: "text-orange-700", bg: "bg-orange-100/50" },
                      { l: "Op. Exp.", v: `− ${Rs(data.stats.totalExpenses)}`, c: "text-amber-700", bg: "bg-amber-100/50" },
                      { l: "Delivery Loss", v: data.stats.deliveryLoss > 0 ? `− ${Rs(data.stats.deliveryLoss)}` : "None", c: data.stats.deliveryLoss > 0 ? "text-orange-700" : "text-gray-400", bg: "bg-orange-100/30" },
                    ].map(r => (
                      <div key={r.l} className={`${r.bg} rounded-xl px-4 py-3 border border-white`}>
                        <p className="text-xs text-gray-500 font-medium mb-1">{r.l}</p>
                        <p className={`font-black text-base ${r.c}`}>{r.v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue & Margins Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Channel breakdown */}
                  <Card className="p-6 border-0 shadow-md">
                    <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />Channel Mix
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">Online</span>
                          <span className="font-bold text-blue-700">{pct(onlinePct)}</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${onlinePct}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{Rs(data.breakdown.revenue.online)}</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">POS</span>
                          <span className="font-bold text-green-700">{pct(posPct)}</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${posPct}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{Rs(data.breakdown.revenue.pos)}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Margins */}
                  <Card className="p-6 border-0 shadow-md">
                    <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />Profit Margins
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-green-50 to-green-100/50 rounded-xl p-3">
                        <p className="text-xs text-gray-600 font-medium">Gross Margin</p>
                        <p className="text-3xl font-black text-green-700">{pct(data.stats.margins.gross)}</p>
                        <p className="text-xs text-gray-500 mt-1">Before operating costs</p>
                      </div>
                      <div className={`rounded-xl p-3 ${isProfit ? "bg-emerald-50" : "bg-red-50"}`}>
                        <p className="text-xs text-gray-600 font-medium">Net Margin</p>
                        <p className={`text-3xl font-black ${isProfit ? "text-emerald-700" : "text-red-600"}`}>{pct(data.stats.margins.net)}</p>
                        <p className="text-xs text-gray-500 mt-1">Bottom line</p>
                      </div>
                    </div>
                  </Card>

                  {/* Key Metrics */}
                  <Card className="p-6 border-0 shadow-md">
                    <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />Key Metrics
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Breakeven Revenue</span>
                        <span className="font-bold text-gray-900">{Rs(data.stats.breakevenRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Safety Margin</span>
                        <span className="font-bold text-green-700">{pct(data.profitability.breakeven.safetyMargin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Return Rate</span>
                        <span className="font-bold text-orange-700">{data.stats.returnRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ROI (on Inventory)</span>
                        <span className="font-bold text-blue-700">{data.stats.roi.toFixed(1)}%</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Expenses Breakdown */}
                <Card className="p-6 border-0 shadow-md">
                  <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-500" />Operating Expenses Breakdown
                  </h3>
                  <div className="space-y-3">
                    {!data.breakdown.expenses.length ? (
                      <p className="text-center text-gray-400 py-6 italic">No operating expenses</p>
                    ) : (
                      data.breakdown.expenses.map((ex, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-700 capitalize">{ex.category}</p>
                              <p className="text-xs text-gray-500">{ex.count} transactions · Avg: {Rs(ex.avgPerTransaction)}</p>
                            </div>
                            <span className="font-bold text-gray-900">{Rs(ex.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400" style={{ width: `${data.stats.totalExpenses > 0 ? (ex.amount / data.stats.totalExpenses) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Wallet */}
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-300 flex items-center gap-2 text-sm mb-1"><Wallet className="h-4 w-4" />Wallet Balance</h3>
                      <p className="text-4xl font-black text-white">Rs. {(data?.wallet.totalBalance ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: "Cash", value: data?.wallet.cash, Icon: Banknote, color: "text-emerald-400" },
                        { label: "Bank", value: data?.wallet.bank, Icon: CreditCard, color: "text-blue-400" },
                        { label: "EasyPaisa", value: data?.wallet.easyPaisa, Icon: Smartphone, color: "text-purple-400" },
                        { label: "JazzCash", value: data?.wallet.jazzCash, Icon: Smartphone, color: "text-orange-400" },
                      ].map(({ label, value, Icon, color }) => (
                        <div key={label} className="bg-white/10 rounded-lg px-3 py-2">
                          <p className={`flex items-center gap-1 text-xs font-semibold mb-1 ${color}`}><Icon className="h-3 w-3" />{label}</p>
                          <p className="text-white font-bold text-xs">Rs. {(value ?? 0).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════ DETAILED P&L TAB ══════════ */}
            {tab === "detailed" && data && (
              <div className="space-y-5">
                <Card className="p-8 border-0 shadow-md">
                  <h2 className="text-2xl font-black text-gray-900 mb-6">Detailed Profit & Loss Analysis</h2>
                  
                  <div className="space-y-8">
                    {/* Step 1: Revenue */}
                    <div className="border-l-4 border-blue-500 pl-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-sm bg-blue-100 text-blue-700 rounded-full h-6 w-6 flex items-center justify-center font-black">1</span>
                        Revenue Calculation
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-blue-50 rounded-xl p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Online Revenue</p>
                          <p className="text-3xl font-black text-blue-700">{Rs(data.breakdown.revenue.online)}</p>
                          <p className="text-xs text-gray-500 mt-1">{data.breakdown.orderMetrics.onlineOrders} orders</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">POS Revenue</p>
                          <p className="text-3xl font-black text-green-700">{Rs(data.breakdown.revenue.pos)}</p>
                          <p className="text-xs text-gray-500 mt-1">{data.breakdown.orderMetrics.posTransactions} transactions</p>
                        </div>
                      </div>
                      <div className="mt-4 bg-white border-2 border-blue-200 rounded-xl p-4">
                        <p className="text-sm text-gray-700 mb-2"><strong>Total Revenue Formula:</strong></p>
                        <p className="text-xs font-mono bg-blue-50 rounded p-2 mb-2">{Rs(data.breakdown.revenue.online)} + {Rs(data.breakdown.revenue.pos)} = {Rs(data.breakdown.revenue.total)}</p>
                        <p className="text-xs text-gray-600"><strong>✓</strong> Includes all completed and non-cancelled orders</p>
                        <p className="text-xs text-gray-600"><strong>✓</strong> Excludes pending transactions</p>
                      </div>
                    </div>

                    {/* Step 2: COGS */}
                    <div className="border-l-4 border-orange-500 pl-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-sm bg-orange-100 text-orange-700 rounded-full h-6 w-6 flex items-center justify-center font-black">2</span>
                        Cost of Goods Sold
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6 mb-4">
                        <div className="bg-orange-50 rounded-xl p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Online COGS</p>
                          <p className="text-3xl font-black text-orange-700">{Rs(data.breakdown.costOfGoods.online)}</p>
                          <p className="text-xs text-gray-500 mt-1">Cost @ buying rate</p>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">POS COGS</p>
                          <p className="text-3xl font-black text-orange-700">{Rs(data.breakdown.costOfGoods.pos)}</p>
                          <p className="text-xs text-gray-500 mt-1">Calculated at sale</p>
                        </div>
                      </div>
                      <div className="bg-white border-2 border-orange-200 rounded-xl p-4">
                        <p className="text-sm text-gray-700 mb-2"><strong>⚠️ COGS Calculation (RECALCULATED):</strong></p>
                        <p className="text-xs font-mono bg-orange-50 rounded p-2 mb-2">FOR EACH item: cost = (lastBuyingRate × quantity)</p>
                        <p className="text-xs text-gray-600"><strong>✓</strong> Never trusts stored profit values</p>
                        <p className="text-xs text-gray-600"><strong>✓</strong> Uses actual buying rates from inventory</p>
                      </div>
                    </div>

                    {/* Step 3: Gross Profit */}
                    <div className="border-l-4 border-green-500 pl-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-sm bg-green-100 text-green-700 rounded-full h-6 w-6 flex items-center justify-center font-black">3</span>
                        Gross Profit
                      </h3>
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                        <div className="text-center mb-4">
                          <p className="text-sm text-gray-600 font-semibold mb-1">Revenue minus COGS</p>
                          <p className="text-4xl font-black text-green-700">{Rs(data.profitability.grossProfit)}</p>
                          <p className="text-xl font-bold text-green-600 mt-2">{pct(data.profitability.grossMargin)} Gross Margin</p>
                        </div>
                        <p className="text-xs font-mono bg-white rounded p-2 text-center text-gray-700">
                          {Rs(data.breakdown.revenue.total)} − {Rs(data.breakdown.costOfGoods.total)} = {Rs(data.profitability.grossProfit)}
                        </p>
                      </div>
                    </div>

                    {/* Step 4: Operating Expenses */}
                    <div className="border-l-4 border-amber-500 pl-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-sm bg-amber-100 text-amber-700 rounded-full h-6 w-6 flex items-center justify-center font-black">4</span>
                        Operating Expenses
                      </h3>
                      <div className="bg-white border-2 border-amber-200 rounded-xl p-4 mb-4">
                        <p className="text-sm font-semibold text-gray-900 mb-3">Total Operating Expenses: <span className="text-amber-700">{Rs(data.profitability.operatingExpenses)}</span></p>
                        <div className="space-y-2">
                          {data.breakdown.expenses.map((ex, i) => (
                            <div key={i} className="flex justify-between text-xs text-gray-700">
                              <span className="capitalize">{ex.category}</span>
                              <span className="font-medium">{Rs(ex.amount)}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-amber-200"><strong>EXCLUDED:</strong> Purchases, Supplier Payments, Refunds (restocked), Delivery Loss (handled separately)</p>
                      </div>
                    </div>

                    {/* Step 5: Delivery Loss */}
                    <div className="border-l-4 border-red-500 pl-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-sm bg-red-100 text-red-700 rounded-full h-6 w-6 flex items-center justify-center font-black">5</span>
                        Delivery Loss (Returns)
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-red-50 rounded-xl p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Unrecoverable Shipping</p>
                          <p className="text-3xl font-black text-red-600">{Rs(data.profitability.deliveryLoss)}</p>
                          <p className="text-xs text-gray-500 mt-1">Loss on {data.breakdown.refunds.totalCount} returns</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4">
                          <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Refunded Amount</p>
                          <p className="text-3xl font-black text-blue-700">{Rs(data.breakdown.refunds.totalRefunded)}</p>
                          <p className="text-xs text-gray-500 mt-1">NOT deducted (goods restocked)</p>
                        </div>
                      </div>
                      <div className="bg-white border-2 border-red-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-900 mb-2">⚠️ Key Principle:</p>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          When a customer returns goods, you get them back in inventory, so there's no net revenue loss on that item. 
                          However, the delivery cost (shipping to customer, shipping back) is lost forever. Only this unrecoverable 
                          delivery cost ({Rs(data.profitability.deliveryLoss)}) is expensed in P&L.
                        </p>
                      </div>
                    </div>

                    {/* Final: Net Profit */}
                    <div className={`border-l-4 ${isProfit ? "border-emerald-500" : "border-red-500"} pl-6`}>
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className={`text-sm rounded-full h-6 w-6 flex items-center justify-center font-black ${isProfit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>✓</span>
                        Net Profit (The Bottom Line)
                      </h3>
                      <div className={`${isProfit ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"} border-2 rounded-xl p-6`}>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 font-semibold mb-2">Gross Profit − Expenses − Delivery Loss</p>
                          <p className={`text-5xl font-black ${isProfit ? "text-emerald-700" : "text-red-600"}`}>{sign(data.profitability.netProfit)}</p>
                          <p className={`text-lg font-bold mt-3 ${isProfit ? "text-emerald-600" : "text-red-500"}`}>{pct(data.profitability.netMargin)} Net Margin</p>
                          <p className="text-xs text-gray-600 mt-2">For every Rs. 100 of sales, you keep Rs. {(data.profitability.netMargin).toFixed(2)}</p>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-300">
                          <p className="text-xs font-mono bg-white rounded p-3 text-center text-gray-800">
                            {Rs(data.profitability.grossProfit)} − {Rs(data.profitability.operatingExpenses)} − {Rs(data.profitability.deliveryLoss)} = {Rs(data.profitability.netProfit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════ P&L STATEMENT TAB ══════════ */}
            {tab === "pl" && data && (
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gray-900 text-white px-6 py-5">
                  <h2 className="font-black text-2xl">Profit & Loss Statement</h2>
                  <p className="text-gray-400 text-sm mt-1">Period: {data.period}</p>
                </div>

                <div className="divide-y divide-gray-100 p-6">
                  {/* Revenue Section */}
                  <div className="pb-6 mb-6">
                    <h3 className="text-lg font-black text-blue-700 mb-4">REVENUE</h3>
                    <div className="space-y-3">
                      <PLRow label="Online Store Sales" value={data.breakdown.revenue.online} />
                      <PLRow label="POS / Walk-in Sales" value={data.breakdown.revenue.pos} />
                      <PLRow label="Total Revenue" value={data.stats.totalRevenue} bold={true} />
                    </div>
                  </div>

                  {/* COGS Section */}
                  <div className="pb-6 mb-6">
                    <h3 className="text-lg font-black text-orange-700 mb-4">COST OF GOODS SOLD</h3>
                    <div className="space-y-3">
                      <PLRow label="Online COGS" value={data.breakdown.costOfGoods.online} indent={true} negative={true} />
                      <PLRow label="POS COGS" value={data.breakdown.costOfGoods.pos} indent={true} negative={true} />
                      <PLRow label="Total COGS" value={data.stats.totalCOGS} bold={true} negative={true} />
                      <PLRow label="Gross Profit" value={data.profitability.grossProfit} bold={true} highlight="green" />
                      <PLRow label="Gross Margin" pct={data.stats.margins.gross} indent={true} />
                    </div>
                  </div>

                  {/* Operating Expenses */}
                  <div className="pb-6 mb-6">
                    <h3 className="text-lg font-black text-amber-700 mb-4">OPERATING EXPENSES</h3>
                    <div className="space-y-3">
                      {data.breakdown.expenses.map((ex, i) => (
                        <PLRow key={i} label={ex.category} value={ex.amount} indent={true} negative={true} />
                      ))}
                      {data.stats.deliveryLoss > 0 && (
                        <PLRow label="Delivery Loss (returns)" value={data.stats.deliveryLoss} indent={true} negative={true} />
                      )}
                      <PLRow label="Total Expenses" value={data.stats.totalExpenses + data.stats.deliveryLoss} bold={true} negative={true} />
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className={`pt-6 ${isProfit ? "bg-emerald-50" : "bg-red-50"} -mx-6 px-6 py-6`}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-black text-gray-900">NET PROFIT / LOSS</h3>
                      <span className={`text-4xl font-black ${isProfit ? "text-emerald-700" : "text-red-600"}`}>{sign(data.profitability.netProfit)}</span>
                    </div>
                    <p className={`text-sm font-semibold mt-2 ${isProfit ? "text-emerald-600" : "text-red-500"}`}>{pct(data.stats.margins.net)} Net Margin</p>
                  </div>
                </div>
              </Card>
            )}

            {/* ══════════ ONLINE SALES TAB ══════════ */}
            {tab === "online" && data && (
              <div className="space-y-5">
                <div className="flex items-center justify-between no-print">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Globe className="h-6 w-6 text-blue-500" />Online Sales Detailed
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard label="Revenue" value={data.breakdown.revenue.online} color="blue" icon={<Globe className="h-4 w-4" />} />
                  <SummaryCard label="COGS" value={data.breakdown.costOfGoods.online} color="orange" icon={<Package className="h-4 w-4" />} />
                  <SummaryCard label="Profit" value={data.breakdown.grossProfitByChannel.online} color="green" icon={<TrendingUp className="h-4 w-4" />} />
                  <SummaryCard label="Orders" value={data.breakdown.orderMetrics.onlineOrders} color="indigo" icon={<ShoppingBag className="h-4 w-4" />} isCount={true} />
                </div>
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="bg-blue-700 text-white px-5 py-3">
                    <h3 className="font-bold">Order Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Order#","Customer","Revenue","COGS","Profit","Margin%"].map(h => (
                            <th key={h} className="px-4 py-3 font-bold text-gray-600 text-xs uppercase text-right">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {!pagedOnline.length ? (
                          <tr><td colSpan={6} className="text-center py-6 text-gray-400">No orders</td></tr>
                        ) : (
                          pagedOnline.map(o => (
                            <tr key={o._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700">{o.orderNumber || o._id.slice(-6).toUpperCase()}</td>
                              <td className="px-4 py-3 text-gray-700 text-xs">{o.customerName || "—"}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">{Rs(o.subtotal)}</td>
                              <td className="px-4 py-3 text-right text-red-600 font-medium">{Rs(o.costOfGoods)}</td>
                              <td className={`px-4 py-3 text-right font-bold ${o.profit >= 0 ? "text-green-700" : "text-red-600"}`}>{Rs(o.profit)}</td>
                              <td className={`px-4 py-3 text-right font-bold ${o.margin >= 0 ? "text-green-600" : "text-red-500"}`}>{o.margin.toFixed(1)}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pages cur={onlinePg} total={Math.ceil(onlineOrders.length / PER_PAGE)} set={setOnlinePg} />
                </Card>
              </div>
            )}

            {/* ══════════ POS SALES TAB ══════════ */}
            {tab === "pos" && data && (
              <div className="space-y-5">
                <div className="flex items-center justify-between no-print">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Store className="h-6 w-6 text-green-500" />POS Sales Detailed
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard label="Revenue" value={data.breakdown.revenue.pos} color="green" icon={<Store className="h-4 w-4" />} />
                  <SummaryCard label="COGS" value={data.breakdown.costOfGoods.pos} color="orange" icon={<Package className="h-4 w-4" />} />
                  <SummaryCard label="Profit" value={data.breakdown.grossProfitByChannel.pos} color="emerald" icon={<TrendingUp className="h-4 w-4" />} />
                  <SummaryCard label="Transactions" value={data.breakdown.orderMetrics.posTransactions} color="teal" icon={<Receipt className="h-4 w-4" />} isCount={true} />
                </div>
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="bg-green-700 text-white px-5 py-3">
                    <h3 className="font-bold">Transaction Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Sale#","Date","Revenue","COGS","Profit","Margin%"].map(h => (
                            <th key={h} className="px-4 py-3 font-bold text-gray-600 text-xs uppercase text-right">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {!pagedPOS.length ? (
                          <tr><td colSpan={6} className="text-center py-6 text-gray-400">No sales</td></tr>
                        ) : (
                          pagedPOS.map(s => (
                            <tr key={s._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs font-bold text-green-700">{s.saleNumber || s._id.slice(-6).toUpperCase()}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs">{new Date(s.createdAt).toLocaleDateString('en-PK')}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">{Rs(s.subtotal)}</td>
                              <td className="px-4 py-3 text-right text-red-600 font-medium">{Rs(s.costOfGoods)}</td>
                              <td className={`px-4 py-3 text-right font-bold ${s.profit >= 0 ? "text-green-700" : "text-red-600"}`}>{Rs(s.profit)}</td>
                              <td className={`px-4 py-3 text-right font-bold ${s.margin >= 0 ? "text-green-600" : "text-red-500"}`}>{s.margin.toFixed(1)}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pages cur={posPg} total={Math.ceil(posSales.length / PER_PAGE)} set={setPosPg} />
                </Card>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-red-700 no-print">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ title, value, icon, color, sub }: {
  title: string; value: number; icon: React.ReactNode;
  color: "blue"|"green"|"emerald"|"red"|"amber"|"indigo"; sub: string;
}) {
  const colors = { 
    blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600", 
    emerald: "bg-emerald-100 text-emerald-600", red: "bg-red-100 text-red-600", 
    amber: "bg-amber-100 text-amber-600", indigo: "bg-indigo-100 text-indigo-600" 
  };
  const vals = { 
    blue: "text-blue-700", green: "text-green-700", emerald: "text-emerald-700", 
    red: "text-red-700", amber: "text-amber-700", indigo: "text-indigo-700" 
  };
  return (
    <Card className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-2xl font-black ${vals[color]}`}>
  Rs. {(value ?? 0).toLocaleString()}
</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{sub}</p>
    </Card>
  );
}

function SummaryCard({ label, value, color, icon, isCount }: {
  label: string; value: number; color: string; icon: React.ReactNode; isCount?: boolean;
}) {
  const colors: Record<string,string> = { 
    blue: "bg-blue-50 text-blue-700", green: "bg-green-50 text-green-700", 
    emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700", 
    teal: "bg-teal-50 text-teal-700", orange: "bg-orange-50 text-orange-700" 
  };
  return (
    <Card className={`p-5 border-2 shadow-sm ${colors[color] || "bg-gray-50 text-gray-700"}`}>
      <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs font-bold uppercase">{label}</span></div>
      <p className="text-2xl font-black">{isCount ? value.toLocaleString() : `Rs. ${value.toLocaleString()}`}</p>
    </Card>
  );
}

function PLRow({ label, value, pct: pctVal, indent, bold, negative, highlight }: {
  label: string; value?: number | null; pct?: number;
  indent?: boolean; bold?: boolean; negative?: boolean; highlight?: "green"|"red";
}) {
  const color = highlight ? (highlight === "green" ? "text-green-700" : "text-red-600") 
    : negative ? "text-red-600" : "text-gray-900";
  return (
    <div className={`flex justify-between ${bold ? "bg-gray-100" : ""} px-4 py-2`}>
      <span className={`text-sm ${bold ? "font-black" : "font-medium"} ${indent ? "ml-4" : ""}`}>{label}</span>
      <span className={`text-sm font-black ${color}`}>
        {pctVal != null ? `${pctVal.toFixed(1)}%` : value != null ? `${negative && value > 0 ? "−" : ""}Rs. ${Math.abs(value).toLocaleString()}` : ""}
      </span>
    </div>
  );
}