"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye, Download, Printer, User, Search,
  Trash2, AlertCircle, X, CheckCircle,
} from "lucide-react";

interface POSOrder {
  _id: string;
  orderNumber: string;
  cashierName: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: any[];
}

interface SaleSummary {
  totalSales: number;
  totalAmount: number;
  totalTax: number;
  avgSaleValue: number;
}

type ToastType = "success" | "error" | null;

export default function POSReportsPage() {
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<POSOrder[]>([]);
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<POSOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{ type: ToastType; message: string }>({ type: null, message: "" });
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 4000);
  };

  useEffect(() => { fetchPOSOrders(); }, []);
  useEffect(() => { applyFilters(); }, [orders, searchTerm, dateFrom, dateTo]);

  const fetchPOSOrders = async () => {
    try {
      const res = await fetch("/api/admin/pos/sale");
      const data = await res.json();
      const apiSales = data.sales || data.orders || (Array.isArray(data) ? data : []);
      setOrders(apiSales);
      calculateSummary(apiSales);
    } catch (error) {
      console.error("Failed to fetch POS sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: POSOrder[]) => {
    const totalSales = data.length;
    const totalAmount = data.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalTax = data.reduce((sum, o) => sum + (o.gstAmount || 0), 0);
    setSummary({ totalSales, totalAmount, totalTax, avgSaleValue: totalSales > 0 ? totalAmount / totalSales : 0 });
  };

  const applyFilters = () => {
    let filtered = orders;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber?.toLowerCase().includes(term) ||
        o.cashierName?.toLowerCase().includes(term)
      );
    }
    if (dateFrom) filtered = filtered.filter(o => new Date(o.createdAt) >= new Date(dateFrom));
    if (dateTo) {
      const dTo = new Date(dateTo); dTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => new Date(o.createdAt) <= dTo);
    }
    setFilteredOrders(filtered);
  };

  const downloadReport = () => {
    const headers = ["Order #", "Cashier", "Subtotal", "GST", "Total", "Payment", "Date"];
    const rows = filteredOrders.map(o => [
      o.orderNumber, o.cashierName || "N/A",
      o.subtotal.toFixed(2), o.gstAmount.toFixed(2), o.total.toFixed(2),
      o.paymentMethod, new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `pos-audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
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
        fetchPOSOrders();
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

  if (loading) return (
    <div className="flex items-center justify-center h-96 text-gray-500">Loading audit logs…</div>
  );

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 1.5cm; } }`}</style>

      <div className="space-y-6 p-4">

        {/* Toast */}
        {toast.type && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white no-print ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}>
            {toast.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">POS Sales Audit</h1>
            <p className="text-gray-600 text-sm">Complete transaction history with user tracking</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button onClick={() => window.print()} variant="outline" className="rounded-full shadow-sm">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button onClick={downloadReport} className="bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-sm">
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Trans.", val: String(summary.totalSales), sym: "" },
              { label: "Total Revenue", val: summary.totalAmount.toLocaleString(), sym: "Rs. " },
              { label: "Total GST", val: summary.totalTax.toLocaleString(), sym: "Rs. " },
              { label: "Avg Sale", val: summary.avgSaleValue.toFixed(0), sym: "Rs. " },
            ].map((item, i) => (
              <Card key={i} className="p-4 border-0 shadow-sm bg-white">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{item.sym}{item.val}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card className="p-5 border-0 shadow-sm no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Search Order or Cashier</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input className="pl-9" placeholder="POS-101 or John Doe" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Date From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Date To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Order #", "Processed By", "Items", "Subtotal", "GST", "Total", "Method", "Date", "Actions"].map(h => (
                    <th key={h} className="px-5 py-4 text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900 text-sm">{order.orderNumber}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                          {order.cashierName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{order.cashierName || "System"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">Rs. {order.subtotal?.toFixed(0)}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">Rs. {order.gstAmount?.toFixed(0)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">Rs. {order.total?.toFixed(0)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${paymentBadge(order.paymentMethod)}`}>
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 no-print">
                        <Button onClick={() => { setSelectedOrder(order); setShowDetail(true); }} size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-indigo-50" title="View details">
                          <Eye className="h-4 w-4 text-indigo-600" />
                        </Button>
                        <Button onClick={() => openDelete(order)} size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-red-50" title="Delete sale">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">No audit records found.</td>
                  </tr>
                )}
              </tbody>
              {filteredOrders.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-5 py-3 font-black text-gray-700 text-sm">TOTAL — {filteredOrders.length} transactions</td>
                    <td className="px-5 py-3 font-black text-indigo-700">
                      Rs. {filteredOrders.reduce((s, o) => s + (o.total || 0), 0).toLocaleString()}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {/* ── Detail Modal ── */}
        {showDetail && selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
            <Card className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-indigo-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-indigo-100 text-xs font-bold uppercase">Audit Record</p>
                    <h2 className="text-2xl font-bold">{selectedOrder.orderNumber}</h2>
                    <p className="text-indigo-200 text-xs mt-1">{new Date(selectedOrder.createdAt).toLocaleString("en-PK")}</p>
                  </div>
                  <button onClick={() => setShowDetail(false)} className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors">
                    <X className="h-5 w-5" />
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

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Itemized List</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-gray-700">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                        <span className="font-semibold">Rs. {item.subtotal?.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>Rs. {selectedOrder.subtotal?.toFixed(0)}</span></div>
                  <div className="flex justify-between text-sm text-gray-600"><span>Tax (GST)</span><span>Rs. {selectedOrder.gstAmount?.toFixed(0)}</span></div>
                  <div className="flex justify-between text-lg font-black text-indigo-600 pt-2 border-t border-dashed">
                    <span>Total</span><span>Rs. {selectedOrder.total?.toFixed(0)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button onClick={() => openDelete(selectedOrder)} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 rounded-xl">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Sale
                  </Button>
                  <Button onClick={() => setShowDetail(false)} className="flex-1 bg-gray-900 hover:bg-black text-white rounded-xl">
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Delete Confirm ── */}
        {deletingId && deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 text-center mb-1">Delete Sale?</h2>
              <p className="text-center text-gray-500 text-sm mb-4">
                {deleteTarget.orderNumber} — Rs. {deleteTarget.total?.toFixed(0)}
              </p>

              <ul className="text-sm text-gray-600 bg-red-50 rounded-xl p-4 mb-5 space-y-1.5">
                <li>• <strong>Wallet reversed:</strong> Rs. {deleteTarget.total?.toFixed(0)} refunded back to <span className="font-semibold capitalize">{deleteTarget.paymentMethod}</span></li>
                <li>• Stock quantities restored for all {deleteTarget.items?.length ?? 0} item(s)</li>
                <li>• Income transaction record deleted from audit trail</li>
                <li>• Sale permanently removed</li>
              </ul>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setDeletingId(null); setDeleteTarget(null); }} className="flex-1 rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleDelete} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl">
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