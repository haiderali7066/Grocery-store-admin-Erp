"use client";

// FILE PATH: app/admin/dashboard/page.tsx

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
  RotateCcw,
  Warehouse,
  ArrowDownLeft,
  Layers,
  ChevronRight,
  ExternalLink,
  Tag,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Types ──────────────────────────────────────────── */
interface LowStockProduct {
  name: string;
  stock: number;
  threshold: number;
}

interface PendingOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  shippingAddress?: {
    fullName?: string;
    city?: string;
  };
  items?: Array<{ name?: string; quantity: number }>;
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

  // ── NEW FIELDS ──────────────────────────────────────────
  // Inventory
  inventoryCurrentValue: number | null;    // total stock cost value (stock × unitCostWithTax)
  inventoryRetailValue: number | null;     // total stock retail value (stock × sellingPrice)
  totalSkus: number | null;                // distinct products with stock > 0
  totalStockUnits: number | null;          // total units across all products

  // Returns
  totalReturns: number | null;             // count of return transactions
  returnAmount: number | null;             // total Rs refunded/credited
  pendingReturnAmount: number | null;      // returns not yet processed

  // Pending orders list (for the detail panel)
  pendingOrdersList: PendingOrder[];
}

/* ─── Palette ──────────────────────────────────────────── */
const GREEN   = "#16A34A";
const GREEN2  = "#22C55E";
const ORANGE  = "#EA580C";
const BLUE    = "#2563EB";
const TEAL    = "#0D9488";
const PURPLE  = "#9333EA";
const AMBER   = "#D97706";
const RED     = "#DC2626";
const INDIGO  = "#4F46E5";
const PIE_COLORS = [GREEN, BLUE, TEAL, PURPLE];

/* ─── Helpers ──────────────────────────────────────────── */
const n    = (v: number | null | undefined) => v ?? 0;
const fmt  = (v: number | null | undefined) => n(v).toLocaleString("en-PK");
const fmtRs = (v: number | null | undefined) => `Rs. ${fmt(v)}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });

/* ─── Fallback ─────────────────────────────────────────── */
const FALLBACK: DashboardStats = {
  totalSales: 0, totalOrders: 0, approvedOrders: 0,
  deliveredOrders: 0, pendingOrders: 0, lowStockProducts: [],
  monthlyData: [
    { month: "Aug", sales: 0, orders: 0 }, { month: "Sep", sales: 0, orders: 0 },
    { month: "Oct", sales: 0, orders: 0 }, { month: "Nov", sales: 0, orders: 0 },
    { month: "Dec", sales: 0, orders: 0 }, { month: "Jan", sales: 0, orders: 0 },
  ],
  dailyData: [], gstCollected: 0, posRevenue: 0, posOrders: 0,
  onlineRevenue: 0, onlineOrders: 0, pendingPayments: 0, fbrStatus: "unknown",
  totalCustomers: 0, cancelledOrders: 0,
  // new
  inventoryCurrentValue: 0, inventoryRetailValue: 0,
  totalSkus: 0, totalStockUnits: 0,
  totalReturns: 0, returnAmount: 0, pendingReturnAmount: 0,
  pendingOrdersList: [],
};

/* ─── Custom Tooltip ───────────────────────────────────── */
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

/* ─── Stat Card ────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  accent: string;
  delay?: number;
  highlight?: boolean;
}
const StatCard = ({ label, value, sub, icon: Icon, iconColor, iconBg, accent, delay = 0, highlight }: StatCardProps) => (
  <div
    className={`stat-card bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all ${highlight ? "border-orange-200 ring-1 ring-orange-100" : "border-gray-100"}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      {highlight && (
        <span className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
          Needs Action
        </span>
      )}
    </div>
    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">{label}</p>
    <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>}
    <div className="mt-3 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
  </div>
);

/* ─── Inventory Value Card ─────────────────────────────── */
const InventoryValueCard = ({ d }: { d: DashboardStats }) => {
  const costVal   = n(d.inventoryCurrentValue);
  const retailVal = n(d.inventoryRetailValue);
  const potentialProfit = retailVal - costVal;
  const marginPct = costVal > 0 ? ((potentialProfit / costVal) * 100).toFixed(1) : "0";

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 stat-card" style={{ animationDelay: "240ms" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Warehouse className="h-5 w-5 text-indigo-700" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Inventory Value</p>
          <p className="text-sm font-bold text-gray-600">Current Stock</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1">Cost Value</p>
          <p className="text-lg font-black text-indigo-800">Rs. {costVal.toLocaleString()}</p>
          <p className="text-[10px] text-indigo-400 mt-0.5">What you paid</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">Retail Value</p>
          <p className="text-lg font-black text-green-700">Rs. {retailVal.toLocaleString()}</p>
          <p className="text-[10px] text-green-400 mt-0.5">If all sold</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Potential Profit</p>
            <p className="text-xl font-black text-emerald-700">Rs. {potentialProfit.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Margin</p>
            <p className="text-2xl font-black text-emerald-600">{marginPct}%</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{fmt(d.totalSkus)} SKUs</span>
        <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{fmt(d.totalStockUnits)} units</span>
      </div>
    </div>
  );
};

/* ─── Returns Card ─────────────────────────────────────── */
const ReturnsCard = ({ d }: { d: DashboardStats }) => {
  const hasReturns = n(d.totalReturns) > 0;
  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 stat-card" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <RotateCcw className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Returns</p>
          <p className="text-sm font-bold text-gray-600">Refunds & Credits</p>
        </div>
        {hasReturns && (
          <span className="ml-auto text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            {fmt(d.totalReturns)} returns
          </span>
        )}
      </div>

      {!hasReturns ? (
        <div className="text-center py-4">
          <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-600">No returns this period</p>
          <p className="text-xs text-gray-400 mt-0.5">All orders fulfilled successfully</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1">Total Returned</p>
              <p className="text-lg font-black text-red-700">Rs. {n(d.returnAmount).toLocaleString()}</p>
              <p className="text-[10px] text-red-400 mt-0.5">{fmt(d.totalReturns)} transactions</p>
            </div>
            <div className={`rounded-xl p-3 border ${n(d.pendingReturnAmount) > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-100"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${n(d.pendingReturnAmount) > 0 ? "text-orange-600" : "text-gray-400"}`}>
                Pending Returns
              </p>
              <p className={`text-lg font-black ${n(d.pendingReturnAmount) > 0 ? "text-orange-700" : "text-gray-400"}`}>
                Rs. {n(d.pendingReturnAmount).toLocaleString()}
              </p>
              <p className={`text-[10px] mt-0.5 ${n(d.pendingReturnAmount) > 0 ? "text-orange-400" : "text-gray-300"}`}>
                {n(d.pendingReturnAmount) > 0 ? "Awaiting processing" : "All cleared"}
              </p>
            </div>
          </div>

          {/* Return rate vs total orders */}
          {n(d.totalOrders) > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Return Rate</p>
                <p className="text-xs font-black text-gray-700">
                  {((n(d.totalReturns) / n(d.totalOrders)) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (n(d.totalReturns) / n(d.totalOrders)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Pending Orders Panel ─────────────────────────────── */
const PendingOrdersPanel = ({ orders, count }: { orders: PendingOrder[]; count: number }) => {
  const PAY_LABELS: Record<string, { label: string; color: string }> = {
    cod:       { label: "COD",       color: "text-green-700 bg-green-50 border-green-200" },
    bank:      { label: "Bank",      color: "text-blue-700 bg-blue-50 border-blue-200" },
    easypaisa: { label: "EasyPaisa", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    jazzcash:  { label: "JazzCash",  color: "text-orange-700 bg-orange-50 border-orange-200" },
  };

  return (
    <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden section-fade">
      {/* Header */}
      <div className="px-5 py-4 border-b border-orange-100 flex items-center justify-between bg-orange-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Pending Orders</h3>
            <p className="text-xs text-gray-400">Awaiting approval or processing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-orange-700 bg-orange-100 border border-orange-200 px-3 py-1 rounded-full">
            {count} pending
          </span>
          <a
            href="/admin/orders?status=pending"
            className="text-xs font-bold text-orange-600 hover:text-orange-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors"
          >
            View all <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-700 text-sm">No pending orders!</p>
          <p className="text-gray-400 text-xs mt-1">All caught up.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 8).map((order, i) => {
              const payCfg = PAY_LABELS[order.paymentMethod?.toLowerCase()] ?? { label: order.paymentMethod?.toUpperCase() ?? "—", color: "text-gray-600 bg-gray-50 border-gray-200" };
              const itemNames = order.items?.slice(0, 2).map(it => it.name || "Item").join(", ") ?? "";
              const moreItems = (order.items?.length ?? 0) > 2 ? ` +${(order.items?.length ?? 0) - 2} more` : "";

              return (
                <div
                  key={order._id}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-orange-50/30 transition-colors group"
                >
                  {/* Order number + date */}
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-xs font-black text-orange-700">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${payCfg.color}`}>
                        {payCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {order.shippingAddress?.fullName && (
                        <span className="font-semibold text-gray-700">{order.shippingAddress.fullName}</span>
                      )}
                      {order.shippingAddress?.city && (
                        <span className="text-gray-400"> · {order.shippingAddress.city}</span>
                      )}
                    </p>
                    {itemNames && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {itemNames}{moreItems}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-gray-900">Rs. {n(order.total).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(order.createdAt)}</p>
                    <p className="text-[10px] text-gray-300">{fmtTime(order.createdAt)}</p>
                  </div>
                  <a
                    href={`/admin/orders/${order._id}`}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-orange-100 text-orange-500"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              );
            })}
          </div>

          {/* Pending total footer */}
          <div className="px-5 py-3 bg-orange-50 border-t border-orange-100 flex items-center justify-between">
            <p className="text-xs text-orange-700 font-semibold">
              Showing {Math.min(orders.length, 8)} of {count} pending orders
            </p>
            <p className="text-sm font-black text-orange-800">
              Rs. {orders.slice(0, 8).reduce((s, o) => s + n(o.total), 0).toLocaleString()} <span className="text-xs font-medium text-orange-500">pending value</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month">("month");
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

  useEffect(() => { fetchStats(); }, [dateRange]);

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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
              <span className="pulse-dot" />
              Last updated: {lastUpdated.toLocaleTimeString("en-PK")}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-green-50 p-1 rounded-xl">
              {(["today", "week", "month"] as const).map((r) => (
                <button key={r} className={`range-btn ${dateRange === r ? "active" : ""}`} onClick={() => setDateRange(r)}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={fetchStats} disabled={isLoading} className="border-green-200 text-green-700 hover:bg-green-50 gap-2 rounded-xl">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <span className={`fbr-badge ${d.fbrStatus === "active" ? "active" : d.fbrStatus === "inactive" ? "inactive" : "unknown"}`}>
              {d.fbrStatus === "active" ? <CheckCircle className="w-3 h-3" /> : d.fbrStatus === "inactive" ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              FBR {d.fbrStatus}
            </span>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Could not reach the server. Showing last known data. Click Refresh to retry.
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gradient-to-r from-green-50 via-white to-green-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* ══ ROW 1 — Primary KPIs ══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard label="Total Revenue"    value={fmtRs(d.totalSales)}       icon={DollarSign}   iconColor="text-green-700"   iconBg="bg-green-100"   accent={GREEN}  delay={0}   />
              <StatCard label="Total Orders"     value={fmt(d.totalOrders)}         icon={ShoppingCart} iconColor="text-blue-700"    iconBg="bg-blue-100"    accent={BLUE}   delay={60}  />
              <StatCard label="Delivered Orders" value={fmt(d.deliveredOrders)}     icon={CheckCircle}  iconColor="text-emerald-700" iconBg="bg-emerald-100" accent={GREEN2} delay={120} />
              <StatCard
                label="Pending Orders"
                value={fmt(d.pendingOrders)}
                icon={Clock}
                iconColor="text-orange-700"
                iconBg="bg-orange-100"
                accent={ORANGE}
                delay={180}
                highlight={n(d.pendingOrders) > 0}
                sub={n(d.pendingOrders) > 0 ? `${fmt(d.pendingOrders)} need review` : "All clear"}
              />
            </div>

            {/* ══ ROW 2 — Secondary KPIs ══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard label="Approved Orders"   value={fmt(d.approvedOrders)}   icon={CheckCircle} iconColor="text-teal-700"   iconBg="bg-teal-100"   accent={TEAL}   delay={0}   />
              <StatCard label="Cancelled Orders"  value={fmt(d.cancelledOrders)}  icon={XCircle}     iconColor="text-red-700"    iconBg="bg-red-100"    accent={RED}    delay={60}  />
              <StatCard label="Pending Payments"  value={fmt(d.pendingPayments)}  icon={Clock}       iconColor="text-amber-700"  iconBg="bg-amber-100"  accent={AMBER}  delay={120} />
              <StatCard label="Total Customers"   value={fmt(d.totalCustomers)}   icon={Users}       iconColor="text-violet-700" iconBg="bg-violet-100" accent={PURPLE} delay={180} />
            </div>

            {/* ══ ROW 3 — Inventory Value + Returns (NEW) ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <InventoryValueCard d={d} />
              <ReturnsCard d={d} />
            </div>

            {/* ══ ROW 4 — POS vs Online Split ══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: "POS Revenue",    value: d.posRevenue,    orders: d.posOrders,    icon: Monitor,    iconBg: "bg-green-100", iconColor: "text-green-700", barFrom: "from-green-500", barTo: "to-emerald-400", barBg: "bg-green-100" },
                { label: "Online Revenue", value: d.onlineRevenue, orders: d.onlineOrders, icon: ShoppingBag, iconBg: "bg-blue-100",  iconColor: "text-blue-700",  barFrom: "from-blue-500",  barTo: "to-cyan-400",    barBg: "bg-blue-100" },
              ].map((row, i) => {
                const pct = n(d.totalSales) ? Math.round((n(row.value) / n(d.totalSales)) * 100) : 0;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 ${row.iconBg} rounded-lg flex items-center justify-center`}>
                        <row.icon className={`w-4 h-4 ${row.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{row.label}</p>
                        <p className="text-xl font-bold text-gray-900">{fmtRs(row.value)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmt(row.orders)} orders</p>
                      </div>
                    </div>
                    <div className={`h-2 rounded-full ${row.barBg} overflow-hidden`}>
                      <div className={`h-full rounded-full bg-gradient-to-r ${row.barFrom} ${row.barTo} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct}% of total revenue</p>
                  </div>
                );
              })}
            </div>

            {/* ══ ROW 5 — PENDING ORDERS DETAIL PANEL (NEW) ══ */}
           <PendingOrdersPanel 
  orders={d.pendingOrdersList ?? []} 
  count={n(d.pendingOrders)} 
/>

            {/* ══ ROW 6 — Sales & Orders Chart + Revenue Pie ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 section-fade">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Revenue & Orders Overview</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{dateRange === "today" ? "Daily breakdown" : "Monthly breakdown"}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Revenue</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Orders</span>
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={GREEN} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={GREEN} stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={BLUE} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={BLUE} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey={dateRange === "today" ? "date" : "month"} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area yAxisId="left"  type="monotone" dataKey="sales"  stroke={GREEN} strokeWidth={2.5} fill="url(#salesGrad)"  dot={false} name="Revenue" />
                      <Area yAxisId="right" type="monotone" dataKey="orders" stroke={BLUE}  strokeWidth={2.5} fill="url(#ordersGrad)" dot={false} name="Orders" />
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
                <h3 className="font-bold text-gray-900 text-base mb-1">Revenue Split</h3>
                <p className="text-xs text-gray-400 mb-4">POS vs Online</p>
                {revenuePieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={revenuePieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value">
                          {revenuePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-auto space-y-2">
                      {revenuePieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-gray-600">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i], display: "inline-block" }} />
                            {item.name}
                          </span>
                          <span className="font-bold text-gray-900">Rs. {item.value.toLocaleString()}</span>
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

            {/* ══ ROW 7 — Bar Chart + Order Distribution Pies ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 section-fade">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 text-base mb-1">Monthly Revenue Bar</h3>
                <p className="text-xs text-gray-400 mb-5">Revenue by month</p>
                {d.monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d.monthlyData} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="sales" name="Revenue" fill={GREEN} radius={[6, 6, 0, 0]} />
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
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Orders Distribution</h3>
                  <p className="text-xs text-gray-400 mb-3">POS vs Online</p>
                  {ordersPieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie data={ordersPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">
                            <Cell fill={GREEN} stroke="none" />
                            <Cell fill={BLUE}  stroke="none" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5">
                        {ordersPieData.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-gray-600">
                              <span className="w-2 h-2 rounded-full" style={{ background: i === 0 ? GREEN : BLUE, display: "inline-block" }} />
                              {item.name}
                            </span>
                            <span className="font-bold text-gray-900">{item.value}</span>
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
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Order Status</h3>
                  <p className="text-xs text-gray-400 mb-3">Breakdown</p>
                  {orderStatusData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">
                            <Cell fill={GREEN}  stroke="none" />
                            <Cell fill={TEAL}   stroke="none" />
                            <Cell fill={ORANGE} stroke="none" />
                            <Cell fill={RED}    stroke="none" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5">
                        {[
                          { label: "Delivered", val: n(d.deliveredOrders), color: GREEN  },
                          { label: "Approved",  val: n(d.approvedOrders),  color: TEAL   },
                          { label: "Pending",   val: n(d.pendingOrders),   color: ORANGE },
                          { label: "Cancelled", val: n(d.cancelledOrders), color: RED    },
                        ].map((row, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-gray-600">
                              <span className="w-2 h-2 rounded-full" style={{ background: row.color, display: "inline-block" }} />
                              {row.label}
                            </span>
                            <span className="font-bold text-gray-900">{row.val}</span>
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

            {/* ══ ROW 8 — Low Stock ══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden section-fade">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Low Stock Alert</h3>
                    <p className="text-xs text-gray-400">{d.lowStockProducts.length} item{d.lowStockProducts.length !== 1 ? "s" : ""} need restocking</p>
                  </div>
                </div>
              </div>
              {d.lowStockProducts.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700 text-sm">All products are well-stocked!</p>
                  <p className="text-gray-400 text-xs mt-1">No restocking needed right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
                  {d.lowStockProducts.slice(0, 9).map((item, i) => {
                    const pct = Math.min(100, Math.round((item.stock / item.threshold) * 100));
                    const isCrit  = item.stock === 0;
                    const isDanger = item.stock <= Math.floor(item.threshold * 0.3);
                    const barColor  = isCrit ? RED : isDanger ? ORANGE : AMBER;
                    const textColor = isCrit ? "text-red-600" : isDanger ? "text-orange-600" : "text-amber-600";
                    return (
                      <div key={i} className="low-stock-row px-5 py-3.5 flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: barColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                          <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${textColor}`}>{item.stock} left</p>
                          <p className="text-xs text-gray-400">min {item.threshold}</p>
                        </div>
                        {isCrit && <span className="shrink-0 text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">OUT</span>}
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

            {/* ══ ROW 9 — GST Summary ══ */}
            <div className="bg-green-50 rounded-2xl border border-green-100 p-6 section-fade">
              <h3 className="font-bold text-green-900 text-sm mb-4 uppercase tracking-wide">GST Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "GST Collected",              value: fmtRs(d.gstCollected), color: "text-green-700" },
                  { label: "Total Revenue (incl. GST)",  value: fmtRs(d.totalSales),   color: "text-blue-700"  },
                ].map((g, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-green-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{g.label}</p>
                    <p className={`text-xl font-extrabold ${g.color}`}>{g.value}</p>
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