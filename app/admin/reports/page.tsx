"use client";
// FILE PATH: app/admin/reports/page.tsx

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle, Loader2, TrendingUp, TrendingDown, ShoppingBag,
  Receipt, Package, RefreshCcw, Store, Globe, BarChart3, FileText,
  Printer, Calendar, ChevronLeft, ChevronRight, Wallet,
  Banknote, CreditCard, Smartphone, Truck, Info,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface SaleItem { name: string; sku?: string | null; quantity: number; price: number; subtotal: number }

interface ReportData {
  stats: {
    totalRevenue: number; grossProfit: number; netProfit: number;
    totalCOGS: number; totalExpenses: number; deliveryLoss: number;
    inventoryValue: number;
    margins: { gross: number; net: number };
  };
  breakdown: {
    online: number; pos: number; onlineCOGS: number; posCOGS: number;
    expenses: { category: string; amount: number }[];
    deliveryLoss: number;
    refunds: { totalRefunded: number; onlineCount: number; posCount: number; totalCount: number };
  };
  wallet: { cash: number; bank: number; easyPaisa: number; jazzCash: number; totalBalance: number };
  detail?: { onlineOrders: OnlineOrder[]; posSales: POSSale[] };
}

interface OnlineOrder {
  _id: string; orderNumber?: string; subtotal: number; costOfGoods: number;
  profit: number; createdAt: string; customerName?: string; orderStatus?: string;
  paymentMethod?: string; items?: SaleItem[];
}

interface POSSale {
  _id: string; saleNumber?: string; cashierName?: string; subtotal: number;
  costOfGoods: number; createdAt: string; paymentMethod?: string; items?: SaleItem[];
}

const PERIODS = ["daily", "weekly", "monthly", "custom"] as const;
type Period = (typeof PERIODS)[number];
type Tab    = "overview" | "pl" | "online" | "pos";
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
        <div className="flex gap-1">
          {Array.from({ length: total }, (_, i) => i + 1).map(p => {
            if (p !== 1 && p !== total && Math.abs(p - cur) > 1) return null;
            return (
              <button key={p} onClick={() => set(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${p === cur ? "bg-green-700 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {p}
              </button>
            );
          })}
        </div>
        <button onClick={() => set(cur + 1)} disabled={cur === total}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

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

  const totalSales = (data?.breakdown.online ?? 0) + (data?.breakdown.pos ?? 0);
  const onlinePct  = totalSales > 0 ? ((data?.breakdown.online ?? 0) / totalSales) * 100 : 0;
  const posPct     = totalSales > 0 ? ((data?.breakdown.pos    ?? 0) / totalSales) * 100 : 0;

  const isProfit   = (data?.stats.netProfit ?? 0) >= 0;

  const periodLabel =
    period === "custom" && dateFrom && dateTo ? `${dateFrom} → ${dateTo}`
    : period.charAt(0).toUpperCase() + period.slice(1);

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

      <div className="p-4 md:p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 no-print">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Full P&L: revenue · COGS · operating expenses · delivery losses</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              {PERIODS.map(p => (
                <button key={p} onClick={() => { setPeriod(p); setShowCustom(p === "custom"); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${period === p ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
                  {p === "custom" ? <><Calendar className="h-3.5 w-3.5 inline mr-1" />Custom</> : p}
                </button>
              ))}
            </div>
            <button onClick={load} className="p-2 text-gray-400 hover:text-green-700 bg-white border border-gray-200 rounded-xl transition-colors">
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
              <Printer className="h-4 w-4" /> Print Report
            </button>
          </div>
        </div>

        {/* Custom range */}
        {showCustom && (
          <div className="flex flex-wrap items-end gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 no-print">
            <div><label className="text-xs font-bold text-gray-500 block mb-1">FROM</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
            <div><label className="text-xs font-bold text-gray-500 block mb-1">TO</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
            <button onClick={() => { if (dateFrom && dateTo) load(); }} disabled={!dateFrom || !dateTo}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-bold hover:bg-green-800 disabled:opacity-40 transition-colors">Apply Range</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit no-print">
          {([
            { id: "overview", label: "Overview",      Icon: BarChart3 },
            { id: "pl",       label: "P&L Statement", Icon: FileText  },
            { id: "online",   label: "Online Sales",  Icon: Globe     },
            { id: "pos",      label: "POS Sales",     Icon: Store     },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === id ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-green-700 h-8 w-8" />
          </div>
        ) : (
          <div id="print-area" ref={printRef}>

            {/* Print header */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-black text-gray-900">
                {tab === "overview" ? "Financial Overview" : tab === "pl" ? "Profit & Loss Statement" : tab === "online" ? "Online Sales Report" : "POS Sales Report"}
              </h1>
              <p className="text-gray-500 text-sm">Period: {periodLabel} · Generated: {new Date().toLocaleString()}</p>
              <hr className="mt-3 border-gray-200" />
            </div>

            {/* ══════════ OVERVIEW ══════════ */}
            {tab === "overview" && data && (
              <div className="space-y-5">

                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total Revenue"   value={data.stats.totalRevenue}   icon={<ShoppingBag className="h-5 w-5" />} color="blue"   sub={periodLabel} />
                  <StatCard title="Gross Profit"    value={data.stats.grossProfit}    icon={<TrendingUp  className="h-5 w-5" />} color="green"  sub={pct(data.stats.margins.gross) + " margin"} />
                  <StatCard title="Net Profit"      value={data.stats.netProfit}
                    icon={isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    color={isProfit ? "emerald" : "red"}
                    sub={pct(data.stats.margins.net) + " net margin"} />
                  <StatCard title="Inventory Value" value={data.stats.inventoryValue} icon={<Package    className="h-5 w-5" />} color="indigo" sub="current stock" />
                </div>

                {/* Net profit hero */}
                <div className={`rounded-2xl p-6 shadow-sm border ${isProfit ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Net Profit / Loss — {periodLabel}</p>
                      <p className={`text-5xl font-black ${isProfit ? "text-emerald-700" : "text-red-600"}`}>{sign(data.stats.netProfit)}</p>
                      <p className={`text-sm font-semibold mt-2 ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                        {isProfit ? "▲ IN PROFIT" : "▼ IN LOSS"} · {pct(data.stats.margins.net)} net margin
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        { l: "Revenue",          v: Rs(data.stats.totalRevenue),   c: "text-gray-900"  },
                        { l: "COGS",             v: `− ${Rs(data.stats.totalCOGS)}`, c: "text-red-600" },
                        { l: "Op. Expenses",     v: `− ${Rs(data.stats.totalExpenses)}`, c: "text-red-600" },
                        { l: "Delivery Losses",  v: data.stats.deliveryLoss > 0 ? `− ${Rs(data.stats.deliveryLoss)}` : "None", c: data.stats.deliveryLoss > 0 ? "text-red-600" : "text-gray-400" },
                      ].map(r => (
                        <div key={r.l} className="bg-white/70 rounded-xl px-3 py-2">
                          <p className="text-xs text-gray-400">{r.l}</p>
                          <p className={`font-black text-sm ${r.c}`}>{r.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Expense breakdown */}
                  <Card className="p-6 border-0 shadow-md">
                    <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2 text-sm"><Receipt className="h-4 w-4 text-gray-400" />Operating Expense Breakdown</h3>
                    <p className="text-[10px] text-gray-400 mb-4 font-medium">Excludes: purchases, supplier payments, refunds &amp; delivery losses (shown separately)</p>
                    <div className="space-y-3">
                      {!data.breakdown.expenses.length
                        ? <p className="text-center text-gray-400 py-6 text-sm italic">No operating expenses this period</p>
                        : data.breakdown.expenses.map((ex, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-600 capitalize">{ex.category}</span>
                              <span className="font-bold text-gray-900">{Rs(ex.amount)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${data.stats.totalExpenses > 0 ? (ex.amount / data.stats.totalExpenses) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))
                      }
                      {data.stats.deliveryLoss > 0 && (
                        <div className="pt-2 border-t border-dashed border-gray-200">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-1 font-medium text-orange-600"><Truck className="h-3.5 w-3.5" />Delivery Losses (returns)</span>
                            <span className="font-bold text-orange-700">{Rs(data.stats.deliveryLoss)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(data.stats.totalExpenses + data.stats.deliveryLoss) > 0 ? (data.stats.deliveryLoss / (data.stats.totalExpenses + data.stats.deliveryLoss)) * 100 : 0}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Refund note */}
                    {data.breakdown.refunds.totalCount > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700">
                          <strong>{data.breakdown.refunds.totalCount} return(s)</strong> issued ({Rs(data.breakdown.refunds.totalRefunded)} refunded) — not deducted from profit since stock was restocked. Only the {Rs(data.stats.deliveryLoss)} unrecoverable delivery cost is expensed.
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Revenue / margin */}
                  <Card className="lg:col-span-2 p-6 border-0 shadow-md">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <p className="text-gray-500 font-medium text-sm mb-1">Gross Profit Margin</p>
                        <p className={`text-6xl font-black ${(data.stats.margins.gross ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>{pct(data.stats.margins.gross)}</p>
                        <p className="text-xs text-gray-400 mt-1">Revenue − COGS, before expenses</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 font-medium text-sm mb-1">Net Margin</p>
                        <p className={`text-4xl font-black ${isProfit ? "text-emerald-700" : "text-red-600"}`}>{pct(data.stats.margins.net)}</p>
                        <p className="text-xs text-gray-400 mt-1">After all expenses</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-gray-500">Gross Profit</p><p className="font-black text-green-700">{Rs(data.stats.grossProfit)}</p></div>
                      <div className="bg-amber-50 rounded-xl p-3"><p className="text-xs text-gray-500">Total Expenses</p><p className="font-black text-amber-700">{Rs(data.stats.totalExpenses + data.stats.deliveryLoss)}</p></div>
                      <div className={`rounded-xl p-3 ${isProfit ? "bg-emerald-50" : "bg-red-50"}`}><p className="text-xs text-gray-500">Net Profit</p><p className={`font-black ${isProfit ? "text-emerald-700" : "text-red-600"}`}>{Rs(data.stats.netProfit)}</p></div>
                    </div>
                    <div className="flex gap-3 items-center text-sm text-gray-600 mb-2">
                      <Globe className="h-4 w-4 text-blue-500" /><strong>Online:</strong> {Rs(data.breakdown.online)} <span className="text-blue-500 font-bold">{pct(onlinePct)}</span>
                      <span className="text-gray-300 mx-1">|</span>
                      <Store className="h-4 w-4 text-green-500" /><strong>POS:</strong> {Rs(data.breakdown.pos)} <span className="text-green-500 font-bold">{pct(posPct)}</span>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 max-w-full">
                      <div className="bg-blue-500 rounded-full"  style={{ width: `${onlinePct}%` }} />
                      <div className="bg-green-500 rounded-full" style={{ width: `${posPct}%`   }} />
                    </div>
                  </Card>
                </div>

                {/* Wallet */}
                <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm mb-1"><Wallet className="h-4 w-4" />Wallet Balance <span className="text-slate-500 font-normal text-xs">(all-time snapshot)</span></h3>
                      <p className="text-4xl font-black text-white">Rs. {(data?.wallet.totalBalance ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: "Cash",      value: data?.wallet.cash,      Icon: Banknote,   color: "text-emerald-400" },
                        { label: "Bank",      value: data?.wallet.bank,      Icon: CreditCard, color: "text-blue-400"    },
                        { label: "EasyPaisa", value: data?.wallet.easyPaisa, Icon: Smartphone, color: "text-purple-400"  },
                        { label: "JazzCash",  value: data?.wallet.jazzCash,  Icon: Smartphone, color: "text-orange-400"  },
                      ].map(({ label, value, Icon, color }) => (
                        <div key={label} className="bg-white/10 rounded-lg px-3 py-2">
                          <p className={`flex items-center gap-1 text-xs font-medium mb-0.5 ${color}`}><Icon className="h-3 w-3" />{label}</p>
                          <p className="text-white font-bold text-sm">Rs. {(value ?? 0).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════ P&L STATEMENT ══════════ */}
            {tab === "pl" && data && (
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gray-900 text-white px-6 py-5 flex justify-between items-start">
                  <div>
                    <h2 className="font-black text-lg">Profit & Loss Statement</h2>
                    <p className="text-gray-400 text-sm">Period: {periodLabel}</p>
                  </div>
                  <button onClick={() => window.print()} className="no-print flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>

                <div className="divide-y divide-gray-100">

                  {/* REVENUE */}
                  <PLSection title="REVENUE" accent="blue">
                    <PLRow label="Online Store Sales" value={data.breakdown.online} indent />
                    <PLRow label="POS / Walk-in Sales" value={data.breakdown.pos}   indent />
                    <PLRow label="Total Revenue"       value={data.stats.totalRevenue} bold />
                  </PLSection>

                  {/* COGS */}
                  <PLSection title="COST OF GOODS SOLD" accent="orange">
                    <PLRow label="Online COGS"    value={data.breakdown.onlineCOGS} indent negative />
                    <PLRow label="POS COGS"       value={data.breakdown.posCOGS}    indent negative />
                    <PLRow label="Total COGS"     value={data.stats.totalCOGS}      bold negative />
                    <PLRow label="Gross Profit"   value={data.stats.grossProfit}    bold highlight={data.stats.grossProfit >= 0 ? "green" : "red"} />
                    <PLRow label="Gross Margin"   value={null} pct={data.stats.margins.gross} indent />
                  </PLSection>

                  {/* OPERATING EXPENSES */}
                  <PLSection title="OPERATING EXPENSES" accent="amber">
                    <p className="px-6 py-1.5 text-[10px] text-gray-400 font-medium ml-4">Purchases, supplier payments, refunds and delivery losses are excluded here</p>
                    {!data.breakdown.expenses.length
                      ? <p className="px-6 py-3 text-sm text-gray-400 italic ml-4">No expenses this period</p>
                      : data.breakdown.expenses.map((ex, i) => (
                          <PLRow key={i} label={ex.category.charAt(0).toUpperCase() + ex.category.slice(1)} value={ex.amount} indent negative />
                        ))
                    }
                    {data.stats.deliveryLoss > 0 && (
                      <PLRow label="Delivery Losses (unrecovered on returns)" value={data.stats.deliveryLoss} indent negative />
                    )}
                    <PLRow label="Total Expenses" value={data.stats.totalExpenses + data.stats.deliveryLoss} bold negative />
                  </PLSection>

                  {/* NET PROFIT */}
                  <div className={`px-6 py-5 ${isProfit ? "bg-emerald-50" : "bg-red-50"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-lg font-black text-gray-900">NET PROFIT / LOSS</span>
                        <p className="text-xs text-gray-500 mt-0.5">Gross Profit − Operating Expenses − Delivery Losses</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-3xl font-black ${isProfit ? "text-emerald-700" : "text-red-600"}`}>{sign(data.stats.netProfit)}</span>
                        <p className={`text-xs font-semibold mt-0.5 ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                          {isProfit ? "▲ PROFIT" : "▼ LOSS"} · {pct(data.stats.margins.net)} net margin
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Refund note */}
                  {data.breakdown.refunds.totalCount > 0 && (
                    <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700">
                        <strong>{data.breakdown.refunds.totalCount} return(s)</strong> totalling {Rs(data.breakdown.refunds.totalRefunded)} were processed this period.
                        These are <strong>not deducted from profit</strong> — goods were restocked so there is no net loss on inventory.
                        Only the unrecoverable delivery cost ({Rs(data.stats.deliveryLoss)}) is expensed above.
                      </p>
                    </div>
                  )}

                  {/* Summary table */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Quick Summary</p>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { label: "Total Revenue",          value: data.stats.totalRevenue,                                     cls: "text-gray-900" },
                          { label: "Cost of Goods Sold",     value: -data.stats.totalCOGS,                                       cls: "text-red-600" },
                          { label: "Gross Profit",           value: data.stats.grossProfit,                                       cls: `font-bold ${data.stats.grossProfit >= 0 ? "text-green-700" : "text-red-600"}` },
                          { label: "Operating Expenses",     value: -data.stats.totalExpenses,                                    cls: "text-red-600" },
                          { label: "Delivery Losses",        value: -data.stats.deliveryLoss,                                     cls: "text-red-600" },
                          { label: "Net Profit / Loss",      value: data.stats.netProfit,                                         cls: `font-black text-base ${isProfit ? "text-emerald-700" : "text-red-600"}` },
                        ].map((row, i) => (
                          <tr key={i}>
                            <td className="py-1.5 text-gray-600 font-medium">{row.label}</td>
                            <td className={`py-1.5 text-right ${row.cls}`}>{sign(row.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            )}

            {/* ══════════ ONLINE SALES ══════════ */}
            {tab === "online" && data && (
              <div className="space-y-5">
                <div className="flex items-center justify-between no-print">
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />Online Sales Report
                    <span className="text-sm font-normal text-gray-400">— {periodLabel}</span>
                  </h2>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard label="Online Revenue" value={data.breakdown.online}                                          color="blue"   icon={<Globe      className="h-4 w-4" />} />
                  <SummaryCard label="Total COGS"     value={data.breakdown.onlineCOGS}                                      color="orange" icon={<Package    className="h-4 w-4" />} />
                  <SummaryCard label="Online Profit"  value={onlineOrders.reduce((a, o) => a + (o.profit ?? 0), 0)}          color="green"  icon={<TrendingUp className="h-4 w-4" />} />
                  <SummaryCard label="Orders"         value={onlineOrders.length}                                            color="indigo" icon={<ShoppingBag className="h-4 w-4" />} isCount />
                </div>
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="bg-blue-700 text-white px-5 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">Order Details</h3>
                    <span className="text-blue-200 text-xs">{onlineOrders.length} orders</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Order #","Customer","Items","Date","Status","Revenue","COGS","Profit","Margin"].map(h => (
                            <th key={h} className={`px-4 py-3 font-bold text-gray-500 text-xs uppercase ${["Revenue","COGS","Profit","Margin"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {!pagedOnline.length
                          ? <tr><td colSpan={9} className="text-center py-10 text-gray-400 italic">No online orders this period</td></tr>
                          : pagedOnline.map(o => {
                              const margin = o.subtotal > 0 ? (o.profit / o.subtotal) * 100 : 0;
                              return (
                                <tr key={o._id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-blue-700">#{o.orderNumber || o._id.slice(-6).toUpperCase()}</td>
                                  <td className="px-4 py-2.5 font-medium text-gray-700 text-xs">{o.customerName || "—"}</td>
                                  <td className="px-4 py-2.5"><ItemList items={o.items} /></td>
                                  <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(o.createdAt).toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"})}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.orderStatus==="delivered"?"bg-green-100 text-green-700":o.orderStatus==="cancelled"?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700"}`}>{o.orderStatus||"—"}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">{Rs(o.subtotal)}</td>
                                  <td className="px-4 py-2.5 text-right text-red-600 font-medium">{Rs(o.costOfGoods)}</td>
                                  <td className={`px-4 py-2.5 text-right font-bold ${o.profit>=0?"text-green-700":"text-red-600"}`}>{Rs(o.profit)}</td>
                                  <td className={`px-4 py-2.5 text-right font-bold ${margin>=0?"text-green-600":"text-red-500"}`}>{margin.toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                      </tbody>
                      {!!pagedOnline.length && (() => {
                        const rev    = pagedOnline.reduce((a,o) => a+o.subtotal,    0);
                        const cogs   = pagedOnline.reduce((a,o) => a+o.costOfGoods, 0);
                        const profit = pagedOnline.reduce((a,o) => a+o.profit,      0);
                        const m      = rev > 0 ? (profit/rev)*100 : 0;
                        return (
                          <tfoot className="bg-blue-50 border-t-2 border-blue-100">
                            <tr>
                              <td colSpan={5} className="px-4 py-3 font-black text-gray-900">TOTAL (Page {onlinePg})</td>
                              <td className="px-4 py-3 text-right font-black text-blue-700">{Rs(rev)}</td>
                              <td className="px-4 py-3 text-right font-black text-red-600">{Rs(cogs)}</td>
                              <td className="px-4 py-3 text-right font-black text-green-700">{Rs(profit)}</td>
                              <td className="px-4 py-3 text-right font-black text-gray-700">{pct(m)}</td>
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>
                  <Pages cur={onlinePg} total={Math.ceil(onlineOrders.length/PER_PAGE)} set={setOnlinePg} />
                </Card>
              </div>
            )}

            {/* ══════════ POS SALES ══════════ */}
            {tab === "pos" && data && (
              <div className="space-y-5">
                <div className="flex items-center justify-between no-print">
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Store className="h-5 w-5 text-green-500" />POS Sales Report
                    <span className="text-sm font-normal text-gray-400">— {periodLabel}</span>
                  </h2>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SummaryCard label="POS Revenue"      value={data.breakdown.pos}                                                      color="green"   icon={<Store      className="h-4 w-4" />} />
                  <SummaryCard label="POS Gross Profit" value={(data.breakdown.pos??0)-(data.breakdown.posCOGS??0)}                     color="emerald" icon={<TrendingUp className="h-4 w-4" />} />
                  <SummaryCard label="Transactions"     value={posSales.length}                                                          color="teal"    icon={<Receipt    className="h-4 w-4" />} isCount />
                </div>
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="bg-green-700 text-white px-5 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">Transaction Details</h3>
                    <span className="text-green-200 text-xs">{posSales.length} transactions</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Sale ID","Date & Time","Items Sold","Payment","Revenue","COGS","Profit"].map(h => (
                            <th key={h} className={`px-4 py-3 font-bold text-gray-500 text-xs uppercase ${["Revenue","COGS","Profit"].includes(h)?"text-right":"text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {!pagedPOS.length
                          ? <tr><td colSpan={7} className="text-center py-10 text-gray-400 italic">No POS sales this period</td></tr>
                          : pagedPOS.map(s => {
                              const profit = s.subtotal - (s.costOfGoods ?? 0);
                              return (
                                <tr key={s._id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-green-700">{s.saleNumber ? `#${s.saleNumber}` : `#${s._id.slice(-6).toUpperCase()}`}</td>
                                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{new Date(s.createdAt).toLocaleString("en-PK",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                                  <td className="px-4 py-2.5"><ItemList items={s.items} /></td>
                                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">{s.paymentMethod||"—"}</span></td>
                                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">{Rs(s.subtotal)}</td>
                                  <td className="px-4 py-2.5 text-right text-red-600 font-medium">{Rs(s.costOfGoods)}</td>
                                  <td className={`px-4 py-2.5 text-right font-bold ${profit>=0?"text-green-700":"text-red-600"}`}>{Rs(profit)}</td>
                                </tr>
                              );
                            })}
                      </tbody>
                      {!!pagedPOS.length && (() => {
                        const cogs   = pagedPOS.reduce((a,s) => a+(s.costOfGoods??0),      0);
                        const profit = pagedPOS.reduce((a,s) => a+s.subtotal-(s.costOfGoods??0), 0);
                        return (
                          <tfoot className="bg-green-50 border-t-2 border-green-100">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 font-black text-gray-900">TOTAL (Page {posPg})</td>
                              <td className="px-4 py-3 text-right font-black text-green-700">{Rs(pagedPOS.reduce((a,s)=>a+s.subtotal,0))}</td>
                              <td className="px-4 py-3 text-right font-black text-red-600">{Rs(cogs)}</td>
                              <td className="px-4 py-3 text-right font-black text-green-700">{Rs(profit)}</td>
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>
                  <Pages cur={posPg} total={Math.ceil(posSales.length/PER_PAGE)} set={setPosPg} />
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
  const bg:  Record<string,string> = { blue:"bg-blue-50 text-blue-600", green:"bg-green-50 text-green-600", emerald:"bg-emerald-50 text-emerald-600", red:"bg-rose-50 text-rose-600", amber:"bg-amber-50 text-amber-600", indigo:"bg-indigo-50 text-indigo-600" };
  const val: Record<string,string> = { blue:"text-blue-700", green:"text-green-700", emerald:"text-emerald-700", red:"text-rose-700", amber:"text-amber-700", indigo:"text-indigo-700" };
  return (
    <Card className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg[color]}`}>{icon}</div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-2xl font-black ${val[color]}`}>Rs. {value.toLocaleString()}</p>
      <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
    </Card>
  );
}

function SummaryCard({ label, value, color, icon, isCount }: {
  label: string; value: number; color: string; icon: React.ReactNode; isCount?: boolean;
}) {
  const colors: Record<string,string> = { blue:"bg-blue-50 text-blue-600 border-blue-100", green:"bg-green-50 text-green-700 border-green-100", emerald:"bg-emerald-50 text-emerald-700 border-emerald-100", indigo:"bg-indigo-50 text-indigo-700 border-indigo-100", teal:"bg-teal-50 text-teal-700 border-teal-100", orange:"bg-orange-50 text-orange-700 border-orange-100" };
  return (
    <Card className={`p-5 border shadow-sm ${colors[color] || "bg-gray-50 text-gray-700 border-gray-100"}`}>
      <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-black">{isCount ? value.toLocaleString() : `Rs. ${value.toLocaleString()}`}</p>
    </Card>
  );
}

function PLSection({ title, accent, children }: { title: string; accent: "blue"|"orange"|"amber"|"red"; children: React.ReactNode }) {
  const colors: Record<string,string> = { blue:"border-l-blue-500 bg-blue-50/50", orange:"border-l-orange-500 bg-orange-50/50", amber:"border-l-amber-500 bg-amber-50/50", red:"border-l-red-500 bg-red-50/50" };
  return (
    <div>
      <div className={`px-6 py-2 border-l-4 ${colors[accent]}`}>
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function PLRow({ label, value, pct: pctVal, indent, bold, negative, highlight }: {
  label: string; value: number|null; pct?: number;
  indent?: boolean; bold?: boolean; negative?: boolean; highlight?: "green"|"red";
}) {
  const textColor = highlight ? (highlight==="green" ? "text-green-700" : "text-red-600") : negative ? "text-red-600" : "text-gray-900";
  return (
    <div className={`flex justify-between items-center px-6 py-2.5 ${bold ? "bg-gray-50" : "hover:bg-gray-50/50"}`}>
      <span className={`text-sm ${bold?"font-bold":"font-medium"} text-gray-700 ${indent?"ml-4":""}`}>{label}</span>
      <span className={`text-sm font-bold ${textColor}`}>
        {pctVal != null
          ? `${pctVal.toFixed(1)}%`
          : value != null
          ? `${negative&&value>0?"−":""}Rs. ${Math.abs(value).toLocaleString()}`
          : null}
      </span>
    </div>
  );
}