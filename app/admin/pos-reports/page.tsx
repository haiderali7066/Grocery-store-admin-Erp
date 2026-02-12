"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  Download,
  Printer,
  User,
  Search,
  AlertCircle,
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

  useEffect(() => {
    fetchPOSOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, dateFrom, dateTo]);

  const fetchPOSOrders = async () => {
    try {
      const res = await fetch("/api/admin/pos/sale");
      const data = await res.json();
      const apiSales =
        data.sales || data.orders || (Array.isArray(data) ? data : []);
      setOrders(apiSales);
      calculateSummary(apiSales);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch POS sales:", error);
      setLoading(false);
    }
  };

  const calculateSummary = (data: POSOrder[]) => {
    const totalSales = data.length;
    const totalAmount = data.reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    );
    const totalTax = data.reduce(
      (sum, order) => sum + (order.gstAmount || 0),
      0,
    );
    const avgSaleValue = totalSales > 0 ? totalAmount / totalSales : 0;

    setSummary({ totalSales, totalAmount, totalTax, avgSaleValue });
  };

  const applyFilters = () => {
    let filtered = orders;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(term) ||
          o.cashierName?.toLowerCase().includes(term),
      );
    }
    if (dateFrom)
      filtered = filtered.filter(
        (o) => new Date(o.createdAt) >= new Date(dateFrom),
      );
    if (dateTo) {
      const dTo = new Date(dateTo);
      dTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => new Date(o.createdAt) <= dTo);
    }
    setFilteredOrders(filtered);
  };

  const downloadReport = () => {
    const headers = [
      "Order #",
      "Audit: Cashier",
      "Subtotal",
      "GST",
      "Total",
      "Payment",
      "Date",
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.cashierName || "N/A",
      o.subtotal.toFixed(2),
      o.gstAmount.toFixed(2),
      o.total.toFixed(2),
      o.paymentMethod,
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pos-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Loading secure audit logs...
      </div>
    );

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">POS Sales Audit</h1>
          <p className="text-gray-600">
            Complete transaction history with user tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="rounded-full shadow-sm"
          >
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button
            onClick={downloadReport}
            className="bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" /> Export Audit
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Trans.", val: summary.totalSales, sym: "" },
            {
              label: "Total Revenue",
              val: summary.totalAmount.toFixed(0),
              sym: "Rs. ",
            },
            {
              label: "Total GST",
              val: summary.totalTax.toFixed(0),
              sym: "Rs. ",
            },
            {
              label: "Avg Sale",
              val: summary.avgSaleValue.toFixed(0),
              sym: "Rs. ",
            },
          ].map((item, i) => (
            <Card key={i} className="p-4 border-0 shadow-sm bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {item.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {item.sym}
                {item.val}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-5 border-0 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-9 h-4 w-4 text-gray-400" />
            <label className="text-xs font-bold text-gray-600 mb-1 block">
              Search Order or User
            </label>
            <Input
              className="pl-9"
              placeholder="Ex: POS-101 or John Doe"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">
              Date From
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">
              Date To
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                  Order #
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                  Processed By
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                  Method
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                          {/* SAFE charAt CHECK */}
                          {order.cashierName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">
                          {order.cashierName || "System"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      Rs. {order.total?.toFixed(0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetail(true);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Eye className="h-4 w-4 text-indigo-600" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    No audit records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detailed Audit Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-indigo-100 text-xs font-bold uppercase">
                    Audit Record
                  </p>
                  <h2 className="text-2xl font-bold">
                    {selectedOrder.orderNumber}
                  </h2>
                </div>
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                  <User className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">
                  Cashier / Auditor:
                </span>
                <span className="text-gray-900 font-bold">
                  {selectedOrder.cashierName || "Unknown"}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                  Itemized List
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-700">
                        {item.name}{" "}
                        <span className="text-gray-400">x{item.quantity}</span>
                      </span>
                      <span className="font-semibold">
                        Rs. {item.subtotal?.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Rs. {selectedOrder.subtotal?.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (GST)</span>
                  <span>Rs. {selectedOrder.gstAmount?.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-indigo-600 pt-2 border-t border-dashed">
                  <span>Total Amount</span>
                  <span>Rs. {selectedOrder.total?.toFixed(0)}</span>
                </div>
              </div>

              <Button
                onClick={() => setShowDetail(false)}
                className="w-full h-12 bg-gray-900 hover:bg-black text-white rounded-xl mt-4"
              >
                Close Audit Entry
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
