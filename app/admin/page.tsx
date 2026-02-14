"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  BarChart2,
  Users,
  ShoppingBag,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Types ─────────────────────────────────────────── */
interface LowStockProduct {
  name: string;
  stock: number;
  threshold: number;
}
interface DashboardStats {
  totalSales: number | null;
  totalOrders: number | null;
  approvedOrders: number | null;
  deliveredOrders: number | null;
  pendingOrders: number | null;
  lowStockProducts: LowStockProduct[];
  monthlyData: Array<{ month: string; sales: number; orders: number }>;
  dailyData: Array<{ date: string; sales: number; orders: number }>;
  gstCollected: number | null;
  posRevenue: number | null;
  posOrders: number | null;
  onlineRevenue: number | null;
  onlineOrders: number | null;
  pendingPayments: number | null;
  fbrStatus: string;
  totalCustomers?: number | null;
  cancelledOrders?: number | null;
}

/* ─── Palette ────────────────────────────────────────── */
const GREEN = "#16A34A";
const GREEN2 = "#22C55E";
const ORANGE = "#EA580C";
const BLUE = "#2563EB";
const TEAL = "#0D9488";
const PURPLE = "#9333EA";
const AMBER = "#D97706";
const RED = "#DC2626";
const PIE_COLORS = [GREEN, BLUE, TEAL, PURPLE];

/* ─── Helpers ────────────────────────────────────────── */
const n = (v: number | null | undefined) => v ?? 0;
const fmt = (v: number | null | undefined) => n(v).toLocaleString("en-PK");
const fmtRs = (v: number | null | undefined) => `Rs. ${fmt(v)}`;

/* ─── Fallback ───────────────────────────────────────── */
const FALLBACK: DashboardStats = {
  totalSales: 0,
  totalOrders: 0,
  approvedOrders: 0,
  deliveredOrders: 0,
  pendingOrders: 0,
  lowStockProducts: [],
  monthlyData: [
    { month: "Aug", sales: 0, orders: 0 },
    { month: "Sep", sales: 0, orders: 0 },
    { month: "Oct", sales: 0, orders: 0 },
    { month: "Nov", sales: 0, orders: 0 },
    { month: "Dec", sales: 0, orders: 0 },
    { month: "Jan", sales: 0, orders: 0 },
  ],
  dailyData: [],
  gstCollected: 0,
  posRevenue: 0,
  posOrders: 0,
  onlineRevenue: 0,
  onlineOrders: 0,
  pendingPayments: 0,
  fbrStatus: "unknown",
  totalCustomers: 0,
  cancelledOrders: 0,
};

/* ─── Custom Tooltip ─────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.dataKey === "orders" ? p.value : `Rs. ${(p.value ?? 0).toLocaleString()}`}
        </p>
      ))}
    </div>
  );
};

/* ─── Stat Card ──────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  accent: string;
  delay?: number;
}
const StatCard = ({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  accent,
  delay = 0,
}: StatCardProps) => (
  <div
    className="stat-card bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between mb-4">
      <div
        className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}
      >
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
      {label}
    </p>
    <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
    <div
      className="mt-3 h-0.5 rounded-full"
      style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
    />
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month">(
    "month",
  );
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/dashboard?range=${dateRange}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setStats(data.stats ?? FALLBACK);
      setLastUpdated(new Date());
    } catch {
      setError(true);
      setStats(FALLBACK);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const d = stats ?? FALLBACK;

  const revenuePieData = [
    { name: "POS", value: n(d.posRevenue) },
    { name: "Online", value: n(d.onlineRevenue) },
  ].filter((x) => x.value > 0);

  const ordersPieData = [
    { name: "POS Orders", value: n(d.posOrders) },
    { name: "Online Orders", value: n(d.onlineOrders) },
  ].filter((x) => x.value > 0);

  const orderStatusData = [
    { name: "Delivered", value: n(d.deliveredOrders) },
    { name: "Approved", value: n(d.approvedOrders) },
    { name: "Pending", value: n(d.pendingOrders) },
    { name: "Cancelled", value: n(d.cancelledOrders) },
  ].filter((x) => x.value > 0);

  const chartData = dateRange === "today" ? d.dailyData : d.monthlyData;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .dash-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

        .stat-card { animation: slideUp 0.4s ease both; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .section-fade { animation: fadeIn 0.5s ease both; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .low-stock-row { transition: background 0.15s ease; }
        .low-stock-row:hover { background: #FFF7ED; }

        .pulse-dot {
          display: inline-block; width: 8px; height: 8px;
          border-radius: 50%; background: #16A34A;
          animation: pulseDot 2s infinite;
        }
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(1.3); }
        }

        .range-btn {
          border-radius: 8px; padding: 6px 16px;
          font-size: 0.8rem; font-weight: 600;
          border: none; cursor: pointer; transition: all 0.15s ease;
        }
        .range-btn.active {
          background: #16A34A; color: white;
          box-shadow: 0 4px 12px -2px rgba(22,163,74,0.35);
        }
        .range-btn:not(.active) { background: #F0FDF4; color: #15803D; }
        .range-btn:not(.active):hover { background: #DCFCE7; }

        .fbr-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 100px;
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase;
        }
        .fbr-badge.active   { background: #DCFCE7; color: #15803D; }
        .fbr-badge.inactive { background: #FEE2E2; color: #991B1B; }
        .fbr-badge.unknown  { background: #FEF3C7; color: #92400E; }
      `}</style>

      <div className="dash-root space-y-8 p-1">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
              <span className="pulse-dot" />
              Last updated: {lastUpdated.toLocaleTimeString("en-PK")}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-green-50 p-1 rounded-xl">
              {(["today", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  className={`range-btn ${dateRange === r ? "active" : ""}`}
                  onClick={() => setDateRange(r)}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchStats}
              disabled={isLoading}
              className="border-green-200 text-green-700 hover:bg-green-50 gap-2 rounded-xl"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <span
              className={`fbr-badge ${
                d.fbrStatus === "active"
                  ? "active"
                  : d.fbrStatus === "inactive"
                    ? "inactive"
                    : "unknown"
              }`}
            >
              {d.fbrStatus === "active" ? (
                <CheckCircle className="w-3 h-3" />
              ) : d.fbrStatus === "inactive" ? (
                <XCircle className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              FBR {d.fbrStatus}
            </span>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Could not reach the server. Showing last known data. Click Refresh
            to retry.
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-gradient-to-r from-green-50 via-white to-green-50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* ══ ROW 1 — Primary KPIs ══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                label="Total Revenue"
                value={fmtRs(d.totalSales)}
                icon={DollarSign}
                iconColor="text-green-700"
                iconBg="bg-green-100"
                accent={GREEN}
                delay={0}
              />
              <StatCard
                label="Total Orders"
                value={fmt(d.totalOrders)}
                icon={ShoppingCart}
                iconColor="text-blue-700"
                iconBg="bg-blue-100"
                accent={BLUE}
                delay={60}
              />
              <StatCard
                label="Delivered Orders"
                value={fmt(d.deliveredOrders)}
                icon={CheckCircle}
                iconColor="text-emerald-700"
                iconBg="bg-emerald-100"
                accent={GREEN2}
                delay={120}
              />
              <StatCard
                label="Pending Orders"
                value={fmt(d.pendingOrders)}
                icon={Clock}
                iconColor="text-orange-700"
                iconBg="bg-orange-100"
                accent={ORANGE}
                delay={180}
              />
            </div>

            {/* ══ ROW 2 — Secondary KPIs ══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                label="Approved Orders"
                value={fmt(d.approvedOrders)}
                icon={CheckCircle}
                iconColor="text-teal-700"
                iconBg="bg-teal-100"
                accent={TEAL}
                delay={0}
              />
              <StatCard
                label="Cancelled Orders"
                value={fmt(d.cancelledOrders)}
                icon={XCircle}
                iconColor="text-red-700"
                iconBg="bg-red-100"
                accent={RED}
                delay={60}
              />
              <StatCard
                label="Pending Payments"
                value={fmt(d.pendingPayments)}
                icon={Clock}
                iconColor="text-amber-700"
                iconBg="bg-amber-100"
                accent={AMBER}
                delay={120}
              />
              <StatCard
                label="Total Customers"
                value={fmt(d.totalCustomers)}
                icon={Users}
                iconColor="text-violet-700"
                iconBg="bg-violet-100"
                accent="#7C3AED"
                delay={180}
              />
            </div>

            {/* ══ ROW 3 — POS vs Online Split ══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                {
                  label: "POS Revenue",
                  value: d.posRevenue,
                  orders: d.posOrders,
                  icon: Monitor,
                  iconBg: "bg-green-100",
                  iconColor: "text-green-700",
                  barFrom: "from-green-500",
                  barTo: "to-emerald-400",
                  barBg: "bg-green-100",
                },
                {
                  label: "Online Revenue",
                  value: d.onlineRevenue,
                  orders: d.onlineOrders,
                  icon: ShoppingBag,
                  iconBg: "bg-blue-100",
                  iconColor: "text-blue-700",
                  barFrom: "from-blue-500",
                  barTo: "to-cyan-400",
                  barBg: "bg-blue-100",
                },
              ].map((row, i) => {
                const pct = n(d.totalSales)
                  ? Math.round((n(row.value) / n(d.totalSales)) * 100)
                  : 0;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-9 h-9 ${row.iconBg} rounded-lg flex items-center justify-center`}
                      >
                        <row.icon className={`w-4 h-4 ${row.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                          {row.label}
                        </p>
                        <p className="text-xl font-bold text-gray-900">
                          {fmtRs(row.value)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {fmt(row.orders)} orders
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-2 rounded-full ${row.barBg} overflow-hidden`}
                    >
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${row.barFrom} ${row.barTo} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {pct}% of total revenue
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ══ ROW 4 — Sales & Orders Chart + Revenue Pie ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 section-fade">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      Revenue & Orders Overview
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {dateRange === "today"
                        ? "Daily breakdown"
                        : "Monthly breakdown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                      Revenue
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      Orders
                    </span>
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="salesGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={GREEN}
                            stopOpacity={0.18}
                          />
                          <stop
                            offset="95%"
                            stopColor={GREEN}
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                        <linearGradient
                          id="ordersGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={BLUE}
                            stopOpacity={0.18}
                          />
                          <stop
                            offset="95%"
                            stopColor={BLUE}
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis
                        dataKey={dateRange === "today" ? "date" : "month"}
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="sales"
                        stroke={GREEN}
                        strokeWidth={2.5}
                        fill="url(#salesGrad)"
                        dot={false}
                        name="Revenue"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="orders"
                        stroke={BLUE}
                        strokeWidth={2.5}
                        fill="url(#ordersGrad)"
                        dot={false}
                        name="Orders"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex flex-col items-center justify-center text-gray-300">
                    <BarChart2 className="w-10 h-10 mb-2" />
                    <p className="text-sm">No chart data for this period</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                <h3 className="font-bold text-gray-900 text-base mb-1">
                  Revenue Split
                </h3>
                <p className="text-xs text-gray-400 mb-4">POS vs Online</p>
                {revenuePieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={revenuePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {revenuePieData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                              stroke="none"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [
                            `Rs. ${v.toLocaleString()}`,
                            "",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-auto space-y-2">
                      {revenuePieData.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2 text-gray-600">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                background: PIE_COLORS[i],
                                display: "inline-block",
                              }}
                            />
                            {item.name}
                          </span>
                          <span className="font-bold text-gray-900">
                            Rs. {item.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                    <p className="text-xs mt-2">No revenue data yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* ══ ROW 5 — Bar Chart + Order Distribution Pies ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 section-fade">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 text-base mb-1">
                  Monthly Revenue Bar
                </h3>
                <p className="text-xs text-gray-400 mb-5">Revenue by month</p>
                {d.monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={d.monthlyData}
                      barCategoryGap="30%"
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="sales"
                        name="Revenue"
                        fill={GREEN}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center text-gray-300">
                    <BarChart2 className="w-10 h-10 mb-2" />
                    <p className="text-sm">No data yet</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Orders Distribution Pie */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">
                    Orders Distribution
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">POS vs Online</p>
                  {ordersPieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie
                            data={ordersPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            <Cell fill={GREEN} stroke="none" />
                            <Cell fill={BLUE} stroke="none" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5">
                        {ordersPieData.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="flex items-center gap-2 text-gray-600">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background: i === 0 ? GREEN : BLUE,
                                  display: "inline-block",
                                }}
                              />
                              {item.name}
                            </span>
                            <span className="font-bold text-gray-900">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-4">
                      <p className="text-xs text-gray-300">No data</p>
                    </div>
                  )}
                </div>

                {/* Order Status Pie */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">
                    Order Status
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">Breakdown</p>
                  {orderStatusData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie
                            data={orderStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            <Cell fill={GREEN} stroke="none" />
                            <Cell fill={TEAL} stroke="none" />
                            <Cell fill={ORANGE} stroke="none" />
                            <Cell fill={RED} stroke="none" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5">
                        {[
                          { label: "Delivered", val: n(d.deliveredOrders), color: GREEN },
                          { label: "Approved", val: n(d.approvedOrders), color: TEAL },
                          { label: "Pending", val: n(d.pendingOrders), color: ORANGE },
                          { label: "Cancelled", val: n(d.cancelledOrders), color: RED },
                        ].map((row, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="flex items-center gap-2 text-gray-600">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background: row.color,
                                  display: "inline-block",
                                }}
                              />
                              {row.label}
                            </span>
                            <span className="font-bold text-gray-900">
                              {row.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-4">
                      <p className="text-xs text-gray-300">No data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══ ROW 6 — Low Stock (full width) ══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden section-fade">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Low Stock Alert
                    </h3>
                    <p className="text-xs text-gray-400">
                      {d.lowStockProducts.length} item
                      {d.lowStockProducts.length !== 1 ? "s" : ""} need
                      restocking
                    </p>
                  </div>
                </div>
              </div>

              {d.lowStockProducts.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700 text-sm">
                    All products are well-stocked!
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    No restocking needed right now.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
                  {d.lowStockProducts.slice(0, 9).map((item, i) => {
                    const pct = Math.min(
                      100,
                      Math.round((item.stock / item.threshold) * 100),
                    );
                    const isCrit = item.stock === 0;
                    const isDanger =
                      item.stock <= Math.floor(item.threshold * 0.3);
                    const barColor = isCrit ? RED : isDanger ? ORANGE : AMBER;
                    const textColor = isCrit
                      ? "text-red-600"
                      : isDanger
                        ? "text-orange-600"
                        : "text-amber-600";
                    return (
                      <div
                        key={i}
                        className="low-stock-row px-5 py-3.5 flex items-center gap-4"
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: barColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {item.name}
                          </p>
                          <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: barColor }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${textColor}`}>
                            {item.stock} left
                          </p>
                          <p className="text-xs text-gray-400">
                            min {item.threshold}
                          </p>
                        </div>
                        {isCrit && (
                          <span className="shrink-0 text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            OUT
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {d.lowStockProducts.length > 9 && (
                <div className="px-5 py-3 border-t border-gray-50 text-xs text-center text-gray-400 font-medium">
                  +{d.lowStockProducts.length - 9} more items need attention
                </div>
              )}
            </div>

            {/* ══ ROW 7 — GST Summary ══ */}
            <div className="bg-green-50 rounded-2xl border border-green-100 p-6 section-fade">
              <h3 className="font-bold text-green-900 text-sm mb-4 uppercase tracking-wide">
                GST Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    label: "GST Collected",
                    value: fmtRs(d.gstCollected),
                    color: "text-green-700",
                  },
                  {
                    label: "Total Revenue (incl. GST)",
                    value: fmtRs(d.totalSales),
                    color: "text-blue-700",
                  },
                ].map((g, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl p-4 border border-green-100"
                  >
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                      {g.label}
                    </p>
                    <p className={`text-xl font-extrabold ${g.color}`}>
                      {g.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}