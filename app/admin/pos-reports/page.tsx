// FILE PATH: app/admin/pos-reports/page.tsx (UPDATED WITH RETURNS)
// ═══════════════════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye, Download, Printer, Search,
  Trash2, AlertCircle, X, CheckCircle,
  ChevronLeft, ChevronRight, RotateCcw, TrendingUp, TrendingDown
} from "lucide-react";

interface SaleItem {
  productId: string | null;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  subtotal: number;
  returned: boolean;
  returnedAt: string | null;
}

interface POSOrder {
  _id: string;
  source: "POSSale" | "Order";
  orderNumber: string;
  cashierName: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: SaleItem[];
}

interface Refund {
  _id: string;
  saleId: string;
  requestedAmount: number;
  deliveryCost: number;
  refundedAmount: number;
  status: "pending" | "approved" | "completed" | "rejected";
  createdAt: string;
  approvedAt?: string;
  reason: string;
  returnItems: Array<{
    name: string;
    returnQty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

interface SaleSummary {
  totalSales: number;
  totalAmount: number;
  totalTax: number;
  avgSaleValue: number;
  totalReturns: number;
  totalRefunded: number;
  totalDeliveryLoss: number;
  returnRate: number;
}

type ToastType = "success" | "error" | null;

const ITEMS_PER_PAGE = 10;

// ── Pagination Component ──────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50 no-print">
      <div className="text-sm font-medium text-gray-600">
        Page <span className="font-bold text-gray-900">{currentPage}</span> of{" "}
        <span className="font-bold text-gray-900">{totalPages}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-gray-600 transition-colors border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-600 transition-colors border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function POSReportsPage() {
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<POSOrder[]>([]);
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "returns">("sales");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<POSOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{ type: ToastType; message: string }>({ type: null, message: "" });
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 4000);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { applyFilters(); setCurrentPage(1); }, [orders, refunds, searchTerm, dateFrom, dateTo, activeTab]);

  const fetchData = async () => {
    try {
      const [salesRes, refundsRes] = await Promise.all([
        fetch("/api/admin/pos/sale"),
        fetch("/api/admin/refunds")
      ]);

      const salesData = await salesRes.json();
      const refundsData = await refundsRes.json();

      const apiSales: POSOrder[] = salesData.sales || [];
      const apiRefunds: Refund[] = Array.isArray(refundsData) ? refundsData : [];

      setOrders(apiSales);
      setRefunds(apiRefunds);
      calculateSummary(apiSales, apiRefunds);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: POSOrder[], refundsData: Refund[]) => {
    const totalSales = data.length;
    const totalAmount = data.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalTax = data.reduce((sum, o) => sum + (o.gstAmount || 0), 0);
    
    const completedRefunds = refundsData.filter(r => r.status === "completed");
    const totalRefunded = completedRefunds.reduce((sum, r) => sum + (r.refundedAmount || 0), 0);
    const totalDeliveryLoss = completedRefunds.reduce((sum, r) => sum + (r.deliveryCost || 0), 0);
    const totalReturns = completedRefunds.length;
    const returnRate = totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;

    setSummary({ 
      totalSales, 
      totalAmount, 
      totalTax, 
      avgSaleValue: totalSales > 0 ? totalAmount / totalSales : 0,
      totalReturns,
      totalRefunded,
      totalDeliveryLoss,
      returnRate
    });
  };

  const applyFilters = () => {
    let filtered = activeTab === "returns" 
      ? refunds 
      : orders;

    if (activeTab === "returns") {
      // Filter refunds
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = (filtered as Refund[]).filter(r =>
          r.reason?.toLowerCase().includes(term) ||
          r.returnItems?.some(item => item.name?.toLowerCase().includes(term))
        );
      }
      if (dateFrom) filtered = (filtered as Refund[]).filter(r => new Date(r.createdAt) >= new Date(dateFrom));
      if (dateTo) {
        const dTo = new Date(dateTo); dTo.setHours(23, 59, 59, 999);
        filtered = (filtered as Refund[]).filter(r => new Date(r.createdAt) <= dTo);
      }
    } else {
      // Filter sales
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = (filtered as POSOrder[]).filter(o =>
          o.orderNumber?.toLowerCase().includes(term) ||
          o.cashierName?.toLowerCase().includes(term) ||
          o.items?.some(item => item.name?.toLowerCase().includes(term))
        );
      }
      if (dateFrom) filtered = (filtered as POSOrder[]).filter(o => new Date(o.createdAt) >= new Date(dateFrom));
      if (dateTo) {
        const dTo = new Date(dateTo); dTo.setHours(23, 59, 59, 999);
        filtered = (filtered as POSOrder[]).filter(o => new Date(o.createdAt) <= dTo);
      }
    }

    setFilteredOrders(filtered);
  };

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const downloadReport = () => {
    if (activeTab === "returns") {
      const headers = ["Refund ID", "Sale ID", "Reason", "Items", "Amount Refunded", "Delivery Loss", "Status", "Date"];
      const rows = (paginatedItems as Refund[]).map(r => [
        r._id,
        r.saleId,
        r.reason,
        `"${r.returnItems?.map(i => `${i.name} x${i.returnQty}`).join("; ") || ""}"`,
        r.refundedAmount?.toFixed(2),
        r.deliveryCost?.toFixed(2),
        r.status,
        new Date(r.createdAt).toLocaleDateString(),
      ]);
      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `pos-returns-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    } else {
      const headers = ["Order #", "Cashier", "Items", "Subtotal", "GST", "Total", "Payment", "Date"];
      const rows = (paginatedItems as POSOrder[]).map(o => [
        o.orderNumber,
        o.cashierName || "N/A",
        `"${o.items?.map(i => `${i.name} x${i.quantity}`).join("; ") || ""}"`,
        o.subtotal.toFixed(2),
        o.gstAmount.toFixed(2),
        o.total.toFixed(2),
        o.paymentMethod,
        new Date(o.createdAt).toLocaleDateString(),
      ]);
      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `pos-sales-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    }
  };

  const openDelete = (order: POSOrder) => {
    setDeleteTarget(order);
    setDeletingId(order._id);
    setShowDetail(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/pos/sale/${deletingId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setDeletingId(null);
        setDeleteTarget(null);
        showToast("success", `${deleteTarget?.orderNumber} deleted — wallet & stock reversed`);
        fetchData();
      } else {
        showToast("error", data.message || "Failed to delete sale");
      }
    } catch {
      showToast("error", "Network error while deleting");
    } finally {
      setIsDeleting(false);
    }
  };

  const paymentBadge = (method: string) => {
    const map: Record<string, string> = {
      cash: "bg-green-100 text-green-700",
      card: "bg-blue-100 text-blue-700",
      easypaisa: "bg-emerald-100 text-emerald-700",
      jazzcash: "bg-orange-100 text-orange-700",
    };
    return map[method?.toLowerCase()] || "bg-gray-100 text-gray-600";
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return map[status?.toLowerCase()] || "bg-gray-100 text-gray-600";
  };

  if (loading) return (
    <div className="flex items-center justify-center text-gray-500 h-96">Loading POS reports…</div>
  );

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 1.5cm; } }`}</style>

      <div className="p-4 space-y-6">

        {/* Toast */}
        {toast.type && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white no-print ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}>
            {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 POS Sales Audit</h1>
            <p className="text-sm text-gray-600">Complete transaction history with returns tracking</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button onClick={downloadReport} className="bg-indigo-600 rounded-full shadow-sm hover:bg-indigo-700">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Total Trans.", val: String(summary.totalSales), sym: "", color: "blue" },
              { label: "Total Revenue", val: summary.totalAmount.toLocaleString(), sym: "Rs. ", color: "green" },
              { label: "Total GST", val: summary.totalTax.toLocaleString(), sym: "Rs. ", color: "amber" },
              { label: "Avg Sale", val: summary.avgSaleValue.toFixed(0), sym: "Rs. ", color: "indigo" },
            ].map((item, i) => {
              const colorMap = { blue: "text-blue-600", green: "text-green-600", amber: "text-amber-600", indigo: "text-indigo-600" };
              return (
                <Card key={i} className="p-4 bg-white border-0 shadow-sm">
                  <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{item.label}</p>
                  <p className={`text-2xl font-bold ${colorMap[item.color as keyof typeof colorMap]} mt-1`}>{item.sym}{item.val}</p>
                </Card>
              );
            })}
          </div>
        )}

        {/* Returns Summary Cards */}
        {summary && summary.totalReturns > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Total Returns", val: String(summary.totalReturns), icon: RotateCcw, color: "orange" },
              { label: "Total Refunded", val: summary.totalRefunded.toLocaleString(), sym: "Rs. ", icon: TrendingDown, color: "red" },
              { label: "Delivery Loss", val: summary.totalDeliveryLoss.toLocaleString(), sym: "Rs. ", icon: AlertCircle, color: "red" },
              { label: "Return Rate", val: summary.returnRate.toFixed(1), sym: "", icon: TrendingUp, color: "amber" },
            ].map((item, i) => {
              const colorMap = { 
                orange: "bg-orange-50 text-orange-700 border-orange-100",
                red: "bg-red-50 text-red-700 border-red-100",
                amber: "bg-amber-50 text-amber-700 border-amber-100"
              };
              return (
                <Card key={i} className={`p-4 border-2 shadow-sm ${colorMap[item.color as keyof typeof colorMap]}`}>
                  <p className="text-xs font-semibold tracking-wider uppercase">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold">{item.sym}{item.val}{item.label === "Return Rate" ? "%" : ""}</p>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 no-print">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === "sales" ? "bg-green-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200"}`}
          >
            Sales Transactions
          </button>
          <button
            onClick={() => setActiveTab("returns")}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === "returns" ? "bg-orange-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200"}`}
          >
            Returns ({summary?.totalReturns || 0})
          </button>
        </div>

        {/* Filters */}
        <Card className="p-5 border-0 shadow-sm no-print">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block mb-1 text-xs font-bold text-gray-600">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input className="pl-9" placeholder={activeTab === "sales" ? "Order, Cashier or Item" : "Reason or Item Name"} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-xs font-bold text-gray-600">Date From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block mb-1 text-xs font-bold text-gray-600">Date To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* ════ SALES TABLE ════ */}
        {activeTab === "sales" && (
          <Card className="overflow-hidden bg-white border-0 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {["Order #", "Processed By", "Items", "Subtotal", "GST", "Total", "Method", "Date", "Actions"].map(h => (
                      <th key={h} className="px-5 py-4 text-xs font-bold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.length > 0 ? (paginatedItems as POSOrder[]).map(order => (
                    <tr key={order._id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{order.orderNumber}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">
                            {order.cashierName?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{order.cashierName || "System"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px]">
                        {order.items?.length > 0 ? (
                          <div className="space-y-0.5">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-xs">
                                <span className="font-medium text-gray-800 truncate max-w-[130px]">{item.name}</span>
                                <span className="text-gray-400 shrink-0">×{item.quantity}</span>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <span className="text-[10px] text-indigo-500 font-semibold">+{order.items.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">Rs. {order.subtotal?.toFixed(0)}</td>
                      <td className="px-5 py-3 text-sm text-gray-400">Rs. {order.gstAmount?.toFixed(0)}</td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">Rs. {order.total?.toFixed(0)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${paymentBadge(order.paymentMethod)}`}>
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 no-print">
                          <Button onClick={() => { setSelectedOrder(order); setShowDetail(true); }} size="sm" variant="ghost" className="w-8 h-8 p-0 rounded-full hover:bg-indigo-50" title="View details">
                            <Eye className="w-4 h-4 text-indigo-600" />
                          </Button>
                          <Button onClick={() => openDelete(order)} size="sm" variant="ghost" className="w-8 h-8 p-0 rounded-full hover:bg-red-50" title="Delete sale">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-400">No sales found.</td>
                    </tr>
                  )}
                </tbody>
                {(paginatedItems as POSOrder[]).length > 0 && (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-5 py-3 text-sm font-black text-gray-700">PAGE TOTAL — {(paginatedItems as POSOrder[]).length} transactions</td>
                      <td className="px-5 py-3 font-black text-green-700">
                        Rs. {(paginatedItems as POSOrder[]).reduce((s, o) => s + (o.total || 0), 0).toLocaleString()}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </Card>
        )}

        {/* ════ RETURNS TABLE ════ */}
        {activeTab === "returns" && (
          <Card className="overflow-hidden bg-white border-0 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {["Ref #", "Sale ID", "Items Returned", "Refunded", "Delivery Loss", "Reason", "Status", "Date"].map(h => (
                      <th key={h} className="px-5 py-4 text-xs font-bold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.length > 0 ? (paginatedItems as Refund[]).map(refund => (
                    <tr key={refund._id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-mono text-sm font-semibold text-gray-900">{refund._id.slice(-6).toUpperCase()}</td>
                      <td className="px-5 py-3 font-mono text-sm text-gray-600">{refund.saleId?.slice(-6).toUpperCase()}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px]">
                        {refund.returnItems?.length > 0 ? (
                          <div className="space-y-0.5">
                            {refund.returnItems.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-xs">
                                <span className="font-medium text-gray-800 truncate">{item.name}</span>
                                <span className="text-gray-400">×{item.returnQty}</span>
                              </div>
                            ))}
                            {refund.returnItems.length > 2 && (
                              <span className="text-[10px] text-orange-500 font-semibold">+{refund.returnItems.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">Rs. {refund.refundedAmount?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm font-medium text-red-600">Rs. {refund.deliveryCost?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 truncate max-w-[150px]" title={refund.reason}>{refund.reason}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusBadge(refund.status)}`}>
                          {refund.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(refund.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short" })}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-400">No returns found.</td>
                    </tr>
                  )}
                </tbody>
                {(paginatedItems as Refund[]).length > 0 && (
                  <tfoot className="border-t-2 border-orange-200 bg-orange-50">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-sm font-black text-gray-700">PAGE TOTAL — {(paginatedItems as Refund[]).length} returns</td>
                      <td className="px-5 py-3 font-black text-orange-700">
                        Rs. {(paginatedItems as Refund[]).reduce((s, r) => s + (r.refundedAmount || 0), 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-black text-red-700">
                        Rs. {(paginatedItems as Refund[]).reduce((s, r) => s + (r.deliveryCost || 0), 0).toLocaleString()}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </Card>
        )}

        {/* ── Detail Modal ── */}
        {showDetail && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <Card className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
              <div className="p-6 text-white bg-green-600">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-100 uppercase">Sale Record</p>
                    <h2 className="text-2xl font-bold">{selectedOrder.orderNumber}</h2>
                    <p className="mt-1 text-xs text-green-200">{new Date(selectedOrder.createdAt).toLocaleString("en-PK")}</p>
                  </div>
                  <button onClick={() => setShowDetail(false)} className="p-2 transition-colors rounded-lg bg-white/20 hover:bg-white/30">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cashier:</span>
                  <span className="font-bold text-gray-900">{selectedOrder.cashierName || "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${paymentBadge(selectedOrder.paymentMethod)}`}>{selectedOrder.paymentMethod}</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                    Itemized List ({selectedOrder.items?.length ?? 0} items)
                  </p>
                  <div className="space-y-2 overflow-y-auto max-h-48">
                    {selectedOrder.items?.length > 0 ? (
                      selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                          <div className="flex-1 min-w-0">
                            <span className="block font-semibold text-gray-800 truncate">{item.name}</span>
                            {item.sku && <span className="font-mono text-gray-400">{item.sku}</span>}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-gray-500">×{item.quantity}</span>
                            <span className="ml-2 font-semibold text-gray-800">Rs. {item.subtotal?.toFixed(0)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs italic text-gray-400">No item details available</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 space-y-2 border-t">
                  <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>Rs. {selectedOrder.subtotal?.toFixed(0)}</span></div>
                  <div className="flex justify-between text-sm text-gray-600"><span>Tax (GST)</span><span>Rs. {selectedOrder.gstAmount?.toFixed(0)}</span></div>
                  <div className="flex justify-between pt-2 text-lg font-black text-green-600 border-t border-dashed">
                    <span>Total</span><span>Rs. {selectedOrder.total?.toFixed(0)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button onClick={() => openDelete(selectedOrder)} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 rounded-xl">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Sale
                  </Button>
                  <Button onClick={() => setShowDetail(false)} className="flex-1 text-white bg-gray-900 hover:bg-black rounded-xl">
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Delete Confirm ── */}
        {deletingId && deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 no-print">
            <div className="w-full max-w-md p-6 bg-white shadow-2xl rounded-2xl">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="mb-1 text-xl font-black text-center text-gray-900">Delete Sale?</h2>
              <p className="mb-4 text-sm text-center text-gray-500">
                {deleteTarget.orderNumber} — Rs. {deleteTarget.total?.toFixed(0)}
              </p>

              <ul className="text-sm text-gray-600 bg-red-50 rounded-xl p-4 mb-5 space-y-1.5">
                <li>• <strong>Wallet reversed:</strong> Rs. {deleteTarget.total?.toFixed(0)} refunded to <span className="font-semibold capitalize">{deleteTarget.paymentMethod}</span></li>
                <li>• Stock restored for {deleteTarget.items?.length ?? 0} item(s)</li>
                <li>• Transaction permanently removed from audit</li>
              </ul>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setDeletingId(null); setDeleteTarget(null); }} className="flex-1 rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleDelete} disabled={isDeleting} className="flex-1 text-white bg-red-600 hover:bg-red-700 rounded-xl">
                  {isDeleting ? "Deleting…" : "Yes, Delete & Reverse"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}