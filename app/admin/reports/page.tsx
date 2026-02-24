"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Receipt,
  Package,
  RefreshCcw,
  Store,
  Globe,
  BarChart3,
  FileText,
  Printer,
  Calendar,
  ChevronDown,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from "lucide-react";

interface ReportData {
  stats: {
    totalRevenue: number;
    grossProfit: number;
    netProfit: number;
    totalExpenses: number;
    inventoryValue: number;
    margins: { gross: number; net: number };
  };
  breakdown: {
    online: number;
    pos: number;
    expenses: { category: string; amount: number }[];
  };
  detail?: {
    onlineOrders: OnlineOrder[];
    posSales: POSSale[];
  };
}

interface OnlineOrder {
  _id: string;
  orderNumber?: string;
  subtotal: number;
  profit: number;
  createdAt: string;
  customerName?: string;
  orderStatus?: string;
}

interface POSSale {
  _id: string;
  subtotal: number;
  costOfGoods: number;
  createdAt: string;
  paymentMethod?: string;
  items?: { name: string; quantity: number; price: number }[];
}

const PERIODS = ["daily", "weekly", "monthly", "custom"] as const;
type Period = (typeof PERIODS)[number];

type ActiveTab = "overview" | "pl" | "online" | "pos";

function fmt(n: number) {
  return `Rs. ${Math.abs(n).toLocaleString()}`;
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export default function ProfitLossPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [showCustom, setShowCustom] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/reports?period=${period}&detail=true`;
      if (period === "custom" && dateFrom && dateTo) {
        url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load reports");
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    if (period !== "custom") fetchData();
  }, [period]);

  const handleCustomApply = () => {
    if (dateFrom && dateTo) fetchData();
  };

  const handlePrint = () => {
    window.print();
  };

  const totalSales = (data?.breakdown.online ?? 0) + (data?.breakdown.pos ?? 0);
  const onlinePct = totalSales > 0 ? (data!.breakdown.online / totalSales) * 100 : 0;
  const posPct = totalSales > 0 ? (data!.breakdown.pos / totalSales) * 100 : 0;

  const periodLabel =
    period === "custom" && dateFrom && dateTo
      ? `${dateFrom} → ${dateTo}`
      : period.charAt(0).toUpperCase() + period.slice(1);

  return (
    <>
      {/* Print styles injected globally */}
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
            <p className="text-gray-500 text-sm mt-1">Financial performance overview</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {/* Period selector */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    setShowCustom(p === "custom");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    period === p
                      ? "bg-white shadow-sm text-green-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {p === "custom" ? <Calendar className="h-3.5 w-3.5 inline" /> : p}
                  {p === "custom" && " Custom"}
                </button>
              ))}
            </div>

            <button
              onClick={fetchData}
              className="p-2 text-gray-400 hover:text-green-700 transition-colors bg-white border border-gray-200 rounded-xl"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </button>
          </div>
        </div>

        {/* Custom date range picker */}
        {showCustom && (
          <div className="flex flex-wrap items-end gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 no-print">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">FROM</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">TO</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleCustomApply}
              disabled={!dateFrom || !dateTo}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-bold hover:bg-green-800 disabled:opacity-40 transition-colors"
            >
              Apply Range
            </button>
          </div>
        )}

        {/* ── Tab switcher ── */}
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit no-print">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "pl", label: "P&L Statement", icon: FileText },
            { id: "online", label: "Online Sales", icon: Globe },
            { id: "pos", label: "POS Sales", icon: Store },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === id
                  ? "bg-white shadow-sm text-green-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-green-700 h-8 w-8" />
          </div>
        ) : (
          <div id="print-area" ref={printRef}>
            {/* Print header — only visible when printing */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-black text-gray-900">
                {activeTab === "overview" && "Financial Overview"}
                {activeTab === "pl" && "Profit & Loss Statement"}
                {activeTab === "online" && "Online Sales Report"}
                {activeTab === "pos" && "POS Sales Report"}
              </h1>
              <p className="text-gray-500 text-sm">Period: {periodLabel}</p>
              <p className="text-gray-400 text-xs">Generated: {new Date().toLocaleString()}</p>
              <hr className="mt-3 border-gray-200" />
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total Revenue" value={data?.stats.totalRevenue ?? 0} icon={<ShoppingBag className="h-5 w-5" />} color="blue" sub={periodLabel} />
                  <StatCard
                    title="Net Profit"
                    value={data?.stats.netProfit ?? 0}
                    icon={(data?.stats.netProfit ?? 0) >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    color={(data?.stats.netProfit ?? 0) >= 0 ? "green" : "red"}
                    sub={`${pct(data?.stats.margins.net ?? 0)} margin`}
                  />
                  <StatCard title="Total Expenses" value={data?.stats.totalExpenses ?? 0} icon={<Receipt className="h-5 w-5" />} color="amber" sub={`${data?.breakdown.expenses.length ?? 0} categories`} />
                  <StatCard title="Inventory Value" value={data?.stats.inventoryValue ?? 0} icon={<Package className="h-5 w-5" />} color="indigo" sub="current stock" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
                  <Card className="p-6 border-0 shadow-md">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-gray-400" />
                      Expense Breakdown
                    </h3>
                    <div className="space-y-3">
                      {data?.breakdown.expenses.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 text-sm italic">No expenses this period</p>
                      ) : (
                        data?.breakdown.expenses.map((ex, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-600 capitalize">{ex.category}</span>
                              <span className="font-bold text-gray-900">{fmt(ex.amount)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${data.stats.totalExpenses > 0 ? (ex.amount / data.stats.totalExpenses) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card className="lg:col-span-2 p-6 border-0 shadow-md flex flex-col justify-center">
                    <div className="text-center">
                      <p className="text-gray-500 font-medium text-sm mb-2">Gross Profit Margin</p>
                      <p className={`text-7xl font-black ${(data?.stats.margins.gross ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {pct(data?.stats.margins.gross ?? 0)}
                      </p>
                      <p className="text-xs text-gray-400 mt-3 max-w-xs mx-auto">
                        Profit after Cost of Goods Sold, before operational expenses
                      </p>
                      <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm mx-auto">
                        <div className="bg-green-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500">Gross Profit</p>
                          <p className="font-black text-green-700 text-base">{fmt(data?.stats.grossProfit ?? 0)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500">Net Margin</p>
                          <p className="font-black text-blue-700 text-base">{pct(data?.stats.margins.net ?? 0)}</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500">Net Profit</p>
                          <p className={`font-black text-base ${(data?.stats.netProfit ?? 0) >= 0 ? "text-purple-700" : "text-red-600"}`}>
                            {fmt(data?.stats.netProfit ?? 0)}
                          </p>
                        </div>
                      </div>

                      {/* Sales channel mini summary */}
                      <div className="mt-5 flex gap-3 justify-center">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Globe className="h-4 w-4 text-blue-500" />
                          <span>Online: <strong>{fmt(data?.breakdown.online ?? 0)}</strong></span>
                          <span className="text-blue-500 font-bold">{pct(onlinePct)}</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Store className="h-4 w-4 text-green-500" />
                          <span>POS: <strong>{fmt(data?.breakdown.pos ?? 0)}</strong></span>
                          <span className="text-green-500 font-bold">{pct(posPct)}</span>
                        </div>
                      </div>
                      {/* Combined bar */}
                      <div className="mt-3 flex h-2.5 rounded-full overflow-hidden gap-0.5 max-w-sm mx-auto">
                        <div className="bg-blue-500 rounded-full" style={{ width: `${onlinePct}%` }} />
                        <div className="bg-green-500 rounded-full" style={{ width: `${posPct}%` }} />
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {/* ── P&L STATEMENT TAB ── */}
            {activeTab === "pl" && (
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gray-900 text-white px-6 py-5 flex justify-between items-start">
                  <div>
                    <h2 className="font-black text-lg">Profit & Loss Statement</h2>
                    <p className="text-gray-400 text-sm">Period: {periodLabel}</p>
                  </div>
                  <button onClick={handlePrint} className="no-print flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  <PLSection title="REVENUE" accent="blue">
                    <PLRow label="Online Store Sales" value={data?.breakdown.online ?? 0} indent />
                    <PLRow label="POS / Walk-in Sales" value={data?.breakdown.pos ?? 0} indent />
                    <PLRow label="Total Revenue" value={data?.stats.totalRevenue ?? 0} bold />
                  </PLSection>

                  <PLSection title="COST OF GOODS SOLD" accent="orange">
                    <PLRow label="Cost of Goods Sold" value={(data?.stats.totalRevenue ?? 0) - (data?.stats.grossProfit ?? 0)} indent negative />
                    <PLRow label="Gross Profit" value={data?.stats.grossProfit ?? 0} bold highlight={(data?.stats.grossProfit ?? 0) >= 0 ? "green" : "red"} />
                    <PLRow label="Gross Margin" value={null} pct={data?.stats.margins.gross ?? 0} indent />
                  </PLSection>

                  <PLSection title="OPERATING EXPENSES" accent="red">
                    {data?.breakdown.expenses.length === 0 && (
                      <div className="px-6 py-3 text-sm text-gray-400 italic ml-4">No expenses this period</div>
                    )}
                    {data?.breakdown.expenses.map((ex, i) => (
                      <PLRow key={i} label={ex.category.charAt(0).toUpperCase() + ex.category.slice(1)} value={ex.amount} indent negative />
                    ))}
                    <PLRow label="Total Operating Expenses" value={data?.stats.totalExpenses ?? 0} bold negative />
                  </PLSection>

                  <div className="px-6 py-5 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-black text-gray-900">NET PROFIT / LOSS</span>
                      <div className="text-right">
                        <span className={`text-2xl font-black ${(data?.stats.netProfit ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {fmt(data?.stats.netProfit ?? 0)}
                        </span>
                        <p className={`text-xs font-semibold mt-0.5 ${(data?.stats.netProfit ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {(data?.stats.netProfit ?? 0) >= 0 ? "PROFIT" : "LOSS"} · {pct(data?.stats.margins.net ?? 0)} net margin
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary table for print */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { label: "Total Revenue", value: data?.stats.totalRevenue ?? 0, class: "text-gray-900" },
                          { label: "Cost of Goods Sold", value: -((data?.stats.totalRevenue ?? 0) - (data?.stats.grossProfit ?? 0)), class: "text-red-600" },
                          { label: "Gross Profit", value: data?.stats.grossProfit ?? 0, class: "text-green-700 font-bold" },
                          { label: "Total Operating Expenses", value: -(data?.stats.totalExpenses ?? 0), class: "text-red-600" },
                          { label: "Net Profit / Loss", value: data?.stats.netProfit ?? 0, class: (data?.stats.netProfit ?? 0) >= 0 ? "text-green-700 font-black text-base" : "text-red-600 font-black text-base" },
                        ].map((row, i) => (
                          <tr key={i}>
                            <td className="py-1.5 text-gray-600 font-medium">{row.label}</td>
                            <td className={`py-1.5 text-right ${row.class}`}>
                              {row.value < 0 ? `− Rs. ${Math.abs(row.value).toLocaleString()}` : `Rs. ${row.value.toLocaleString()}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            )}

            {/* ── ONLINE SALES REPORT ── */}
            {activeTab === "online" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between no-print">
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Online Sales Report
                    <span className="text-sm font-normal text-gray-400">— {periodLabel}</span>
                  </h2>
                  <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SummaryCard label="Online Revenue" value={data?.breakdown.online ?? 0} color="blue" icon={<Globe className="h-4 w-4" />} />
                  <SummaryCard label="Online Profit" value={(data?.detail?.onlineOrders ?? []).reduce((a, o) => a + o.profit, 0)} color="green" icon={<TrendingUp className="h-4 w-4" />} />
                  <SummaryCard label="Orders" value={(data?.detail?.onlineOrders ?? []).length} color="indigo" icon={<ShoppingBag className="h-4 w-4" />} isCount />
                </div>

                {/* Orders table */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="bg-blue-700 text-white px-5 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">Order Details</h3>
                    <span className="text-blue-200 text-xs">{(data?.detail?.onlineOrders ?? []).length} orders</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Order #</th>
                          <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                          <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                          <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Revenue</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Profit</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(data?.detail?.onlineOrders ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-gray-400 italic">No online orders this period</td>
                          </tr>
                        ) : (
                          (data?.detail?.onlineOrders ?? []).map((order) => {
                            const margin = order.subtotal > 0 ? (order.profit / order.subtotal) * 100 : 0;
                            return (
                              <tr key={order._id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-2.5 font-mono text-xs font-bold text-blue-700">
                                  #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                                </td>
                                <td className="px-4 py-2.5 font-medium text-gray-700">{order.customerName || "—"}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">
                                  {new Date(order.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    order.orderStatus === "delivered" ? "bg-green-100 text-green-700" :
                                    order.orderStatus === "cancelled" ? "bg-red-100 text-red-700" :
                                    "bg-blue-100 text-blue-700"
                                  }`}>{order.orderStatus || "—"}</span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                                  Rs. {order.subtotal.toLocaleString()}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-bold ${order.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                                  Rs. {order.profit.toLocaleString()}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-bold ${margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                                  {margin.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {(data?.detail?.onlineOrders ?? []).length > 0 && (
                        <tfoot className="bg-blue-50 border-t-2 border-blue-100">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 font-black text-gray-900">TOTAL</td>
                            <td className="px-4 py-3 text-right font-black text-blue-700">
                              Rs. {(data?.breakdown.online ?? 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-green-700">
                              Rs. {(data?.detail?.onlineOrders ?? []).reduce((a, o) => a + o.profit, 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-gray-700">
                              {(data?.breakdown.online ?? 0) > 0
                                ? pct(((data?.detail?.onlineOrders ?? []).reduce((a, o) => a + o.profit, 0) / (data?.breakdown.online ?? 1)) * 100)
                                : "0%"}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* ── POS SALES REPORT ── */}
            {activeTab === "pos" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between no-print">
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Store className="h-5 w-5 text-green-500" />
                    POS Sales Report
                    <span className="text-sm font-normal text-gray-400">— {periodLabel}</span>
                  </h2>
                  <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SummaryCard label="POS Revenue" value={data?.breakdown.pos ?? 0} color="green" icon={<Store className="h-4 w-4" />} />
                  <SummaryCard
                    label="POS Gross Profit"
                    value={(data?.breakdown.pos ?? 0) - ((data?.detail?.posSales ?? []).reduce((a, s) => a + (s.costOfGoods ?? 0), 0))}
                    color="emerald"
                    icon={<TrendingUp className="h-4 w-4" />}
                  />
                  <SummaryCard label="Transactions" value={(data?.detail?.posSales ?? []).length} color="teal" icon={<Receipt className="h-4 w-4" />} isCount />
                </div>

                {/* POS table */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="bg-green-700 text-white px-5 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">Transaction Details</h3>
                    <span className="text-green-200 text-xs">{(data?.detail?.posSales ?? []).length} transactions</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Sale ID</th>
                          <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Date & Time</th>
                          <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Payment</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Revenue</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">COGS</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(data?.detail?.posSales ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-400 italic">No POS sales this period</td>
                          </tr>
                        ) : (
                          (data?.detail?.posSales ?? []).map((sale) => {
                            const profit = sale.subtotal - (sale.costOfGoods ?? 0);
                            return (
                              <tr key={sale._id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-2.5 font-mono text-xs font-bold text-green-700">
                                  #{sale._id.slice(-6).toUpperCase()}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">
                                  {new Date(sale.createdAt).toLocaleString("en-PK", {
                                    day: "2-digit", month: "short", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">
                                    {sale.paymentMethod || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                                  Rs. {sale.subtotal.toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                                  Rs. {(sale.costOfGoods ?? 0).toLocaleString()}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-bold ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                                  Rs. {profit.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {(data?.detail?.posSales ?? []).length > 0 && (() => {
                        const totalCOGS = (data?.detail?.posSales ?? []).reduce((a, s) => a + (s.costOfGoods ?? 0), 0);
                        const totalProfit = (data?.breakdown.pos ?? 0) - totalCOGS;
                        return (
                          <tfoot className="bg-green-50 border-t-2 border-green-100">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 font-black text-gray-900">TOTAL</td>
                              <td className="px-4 py-3 text-right font-black text-green-700">
                                Rs. {(data?.breakdown.pos ?? 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-red-600">
                                Rs. {totalCOGS.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-green-700">
                                Rs. {totalProfit.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>
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

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ title, value, icon, color, sub }: {
  title: string; value: number; icon: React.ReactNode;
  color: "blue" | "green" | "red" | "amber" | "indigo"; sub: string;
}) {
  const bg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600", amber: "bg-amber-50 text-amber-600", indigo: "bg-indigo-50 text-indigo-600",
  };
  const val: Record<string, string> = {
    blue: "text-blue-700", green: "text-emerald-700", red: "text-rose-700",
    amber: "text-amber-700", indigo: "text-indigo-700",
  };
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
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    teal: "bg-teal-50 text-teal-700 border-teal-100",
  };
  return (
    <Card className={`p-5 border shadow-sm ${colors[color] || "bg-gray-50 text-gray-700 border-gray-100"}`}>
      <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-black">
        {isCount ? value.toLocaleString() : `Rs. ${value.toLocaleString()}`}
      </p>
    </Card>
  );
}

function PLSection({ title, accent, children }: {
  title: string; accent: "blue" | "orange" | "red"; children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue: "border-l-blue-500 bg-blue-50/50",
    orange: "border-l-orange-500 bg-orange-50/50",
    red: "border-l-red-500 bg-red-50/50",
  };
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
  label: string; value: number | null; pct?: number;
  indent?: boolean; bold?: boolean; negative?: boolean; highlight?: "green" | "red";
}) {
  const textColor = highlight
    ? highlight === "green" ? "text-green-700" : "text-red-600"
    : negative ? "text-red-600" : "text-gray-900";
  return (
    <div className={`flex justify-between items-center px-6 py-2.5 ${bold ? "bg-gray-50" : "hover:bg-gray-50/50"}`}>
      <span className={`text-sm ${bold ? "font-bold" : "font-medium"} text-gray-700 ${indent ? "ml-4" : ""}`}>{label}</span>
      <span className={`text-sm font-bold ${textColor}`}>
        {pctVal != null
          ? `${pctVal.toFixed(1)}%`
          : value != null
          ? `${negative && value > 0 ? "−" : ""}Rs. ${Math.abs(value).toLocaleString()}`
          : null}
      </span>
    </div>
  );
}