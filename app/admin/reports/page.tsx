"use client";

import { useEffect, useState, useCallback } from "react";
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
}

const PERIODS = ["daily", "weekly", "monthly"] as const;
type Period = typeof PERIODS[number];

export default function ProfitLossPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("monthly");
  const [activeTab, setActiveTab] = useState<"overview" | "pl" | "sales">("overview");

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalSales = (data?.breakdown.online ?? 0) + (data?.breakdown.pos ?? 0);
  const onlinePct = totalSales > 0 ? (data!.breakdown.online / totalSales) * 100 : 0;
  const posPct = totalSales > 0 ? (data!.breakdown.pos / totalSales) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Financial performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  period === p
                    ? "bg-white shadow-sm text-green-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-green-700 transition-colors bg-white border border-gray-200 rounded-xl"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "pl", label: "P&L Statement", icon: FileText },
          { id: "sales", label: "Sales Breakdown", icon: Store },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
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
        <>
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Revenue"
                  value={data?.stats.totalRevenue ?? 0}
                  icon={<ShoppingBag className="h-5 w-5" />}
                  color="blue"
                  sub={`${period} period`}
                />
                <StatCard
                  title="Net Profit"
                  value={data?.stats.netProfit ?? 0}
                  icon={
                    (data?.stats.netProfit ?? 0) >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )
                  }
                  color={(data?.stats.netProfit ?? 0) >= 0 ? "green" : "red"}
                  sub={`${data?.stats.margins.net.toFixed(1) ?? 0}% margin`}
                />
                <StatCard
                  title="Total Expenses"
                  value={data?.stats.totalExpenses ?? 0}
                  icon={<Receipt className="h-5 w-5" />}
                  color="amber"
                  sub={`${data?.breakdown.expenses.length ?? 0} categories`}
                />
                <StatCard
                  title="Inventory Value"
                  value={data?.stats.inventoryValue ?? 0}
                  icon={<Package className="h-5 w-5" />}
                  color="indigo"
                  sub="current stock"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Expense breakdown */}
                <Card className="p-6 border-0 shadow-md">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-gray-400" />
                    Expense Breakdown
                  </h3>
                  <div className="space-y-3">
                    {data?.breakdown.expenses.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm italic">
                        No expenses this period
                      </p>
                    ) : (
                      data?.breakdown.expenses.map((ex, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-600 capitalize">
                              {ex.category}
                            </span>
                            <span className="font-bold text-gray-900">
                              Rs. {ex.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{
                                width: `${
                                  data.stats.totalExpenses > 0
                                    ? (ex.amount / data.stats.totalExpenses) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Gross margin big display */}
                <Card className="lg:col-span-2 p-6 border-0 shadow-md flex flex-col justify-center">
                  <div className="text-center">
                    <p className="text-gray-500 font-medium text-sm mb-2">
                      Gross Profit Margin
                    </p>
                    <p
                      className={`text-7xl font-black ${
                        (data?.stats.margins.gross ?? 0) >= 0
                          ? "text-green-700"
                          : "text-red-600"
                      }`}
                    >
                      {data?.stats.margins.gross.toFixed(1) ?? 0}%
                    </p>
                    <p className="text-xs text-gray-400 mt-3 max-w-xs mx-auto">
                      Profit after Cost of Goods Sold, before operational expenses
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-4 max-w-xs mx-auto">
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Gross Profit</p>
                        <p className="font-black text-green-700 text-lg">
                          Rs. {(data?.stats.grossProfit ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Net Margin</p>
                        <p className="font-black text-blue-700 text-lg">
                          {data?.stats.margins.net.toFixed(1) ?? 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* ── P&L STATEMENT TAB ── */}
          {activeTab === "pl" && (
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-gray-900 text-white px-6 py-5">
                <h2 className="font-black text-lg">Profit & Loss Statement</h2>
                <p className="text-gray-400 text-sm capitalize">
                  Period: {period}
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {/* Revenue section */}
                <PLSection title="REVENUE" accent="blue">
                  <PLRow
                    label="Online Store Sales"
                    value={data?.breakdown.online ?? 0}
                    indent
                  />
                  <PLRow
                    label="POS / Walk-in Sales"
                    value={data?.breakdown.pos ?? 0}
                    indent
                  />
                  <PLRow
                    label="Total Revenue"
                    value={data?.stats.totalRevenue ?? 0}
                    bold
                  />
                </PLSection>

                {/* COGS */}
                <PLSection title="COST OF GOODS SOLD" accent="orange">
                  <PLRow
                    label="Cost of Goods Sold"
                    value={(data?.stats.totalRevenue ?? 0) - (data?.stats.grossProfit ?? 0)}
                    indent
                    negative
                  />
                  <PLRow
                    label="Gross Profit"
                    value={data?.stats.grossProfit ?? 0}
                    bold
                    highlight={(data?.stats.grossProfit ?? 0) >= 0 ? "green" : "red"}
                  />
                  <PLRow
                    label="Gross Margin"
                    value={null}
                    pct={data?.stats.margins.gross ?? 0}
                    indent
                  />
                </PLSection>

                {/* Operating expenses */}
                <PLSection title="OPERATING EXPENSES" accent="red">
                  {data?.breakdown.expenses.map((ex, i) => (
                    <PLRow
                      key={i}
                      label={ex.category.charAt(0).toUpperCase() + ex.category.slice(1)}
                      value={ex.amount}
                      indent
                      negative
                    />
                  ))}
                  <PLRow
                    label="Total Operating Expenses"
                    value={data?.stats.totalExpenses ?? 0}
                    bold
                    negative
                  />
                </PLSection>

                {/* Net profit */}
                <div className="px-6 py-5 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-gray-900">
                      NET PROFIT / LOSS
                    </span>
                    <div className="text-right">
                      <span
                        className={`text-2xl font-black ${
                          (data?.stats.netProfit ?? 0) >= 0
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        Rs. {Math.abs(data?.stats.netProfit ?? 0).toLocaleString()}
                      </span>
                      <p
                        className={`text-xs font-semibold mt-0.5 ${
                          (data?.stats.netProfit ?? 0) >= 0
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {(data?.stats.netProfit ?? 0) >= 0 ? "PROFIT" : "LOSS"} ·{" "}
                        {data?.stats.margins.net.toFixed(1)}% net margin
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── SALES BREAKDOWN TAB ── */}
          {activeTab === "sales" && (
            <div className="space-y-5">
              {/* Online vs POS comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card className="p-6 border-0 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Globe className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Online Store
                      </p>
                      <p className="text-2xl font-black text-gray-900">
                        Rs. {(data?.breakdown.online ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${onlinePct}%` }}
                    />
                  </div>
                  <p className="text-sm font-bold text-blue-600 mt-2">
                    {onlinePct.toFixed(1)}% of total
                  </p>
                </Card>

                <Card className="p-6 border-0 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                      <Store className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        POS / Walk-in
                      </p>
                      <p className="text-2xl font-black text-gray-900">
                        Rs. {(data?.breakdown.pos ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${posPct}%` }}
                    />
                  </div>
                  <p className="text-sm font-bold text-green-600 mt-2">
                    {posPct.toFixed(1)}% of total
                  </p>
                </Card>
              </div>

              {/* Combined visual bar */}
              <Card className="p-6 border-0 shadow-md">
                <h3 className="font-bold text-gray-900 mb-5">Sales Channel Distribution</h3>
                <div className="flex h-10 rounded-xl overflow-hidden gap-0.5">
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                    style={{ width: `${onlinePct}%`, minWidth: onlinePct > 5 ? "auto" : 0 }}
                    title={`Online: Rs. ${data?.breakdown.online.toLocaleString()}`}
                  >
                    {onlinePct > 15 && "Online"}
                  </div>
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                    style={{ width: `${posPct}%`, minWidth: posPct > 5 ? "auto" : 0 }}
                    title={`POS: Rs. ${data?.breakdown.pos.toLocaleString()}`}
                  >
                    {posPct > 15 && "POS"}
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm text-gray-600">
                      Online —{" "}
                      <strong>Rs. {(data?.breakdown.online ?? 0).toLocaleString()}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-600">
                      POS —{" "}
                      <strong>Rs. {(data?.breakdown.pos ?? 0).toLocaleString()}</strong>
                    </span>
                  </div>
                </div>
              </Card>

              {/* Summary table */}
              <Card className="border-0 shadow-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-bold text-gray-600">Channel</th>
                      <th className="text-right px-5 py-3 font-bold text-gray-600">Revenue</th>
                      <th className="text-right px-5 py-3 font-bold text-gray-600">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-3 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Online Store</span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold">
                        Rs. {(data?.breakdown.online ?? 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-blue-600 font-bold">
                        {onlinePct.toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-3 flex items-center gap-2">
                        <Store className="h-4 w-4 text-green-500" />
                        <span className="font-medium">POS / Walk-in</span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold">
                        Rs. {(data?.breakdown.pos ?? 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-green-600 font-bold">
                        {posPct.toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="bg-gray-50 font-black">
                      <td className="px-5 py-3">Total</td>
                      <td className="px-5 py-3 text-right">
                        Rs. {totalSales.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon, color, sub,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "amber" | "indigo";
  sub: string;
}) {
  const bg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  const val: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-emerald-700",
    red: "text-rose-700",
    amber: "text-amber-700",
    indigo: "text-indigo-700",
  };
  return (
    <Card className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-2xl font-black ${val[color]}`}>
        Rs. {value.toLocaleString()}
      </p>
      <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
    </Card>
  );
}

function PLSection({
  title, accent, children,
}: {
  title: string;
  accent: "blue" | "orange" | "red";
  children: React.ReactNode;
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

function PLRow({
  label, value, pct, indent, bold, negative, highlight,
}: {
  label: string;
  value: number | null;
  pct?: number;
  indent?: boolean;
  bold?: boolean;
  negative?: boolean;
  highlight?: "green" | "red";
}) {
  const textColor = highlight
    ? highlight === "green" ? "text-green-700" : "text-red-600"
    : negative ? "text-red-600" : "text-gray-900";

  return (
    <div
      className={`flex justify-between items-center px-6 py-2.5 ${
        bold ? "bg-gray-50" : "hover:bg-gray-50/50"
      }`}
    >
      <span
        className={`text-sm ${bold ? "font-bold" : "font-medium"} text-gray-700 ${
          indent ? "ml-4" : ""
        }`}
      >
        {label}
      </span>
      <span className={`text-sm font-bold ${textColor}`}>
        {pct != null ? (
          `${pct.toFixed(1)}%`
        ) : value != null ? (
          `${negative && value > 0 ? "−" : ""}Rs. ${Math.abs(value).toLocaleString()}`
        ) : null}
      </span>
    </div>
  );
}