'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Download, Printer } from 'lucide-react';

interface POSOrder {
  _id: string;
  orderNumber: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
      const res = await fetch('/api/admin/pos/orders');
      const data = await res.json();
      setOrders(data.orders || []);
      calculateSummary(data.orders || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch POS orders:', error);
      setLoading(false);
    }
  };

  const calculateSummary = (data: POSOrder[]) => {
    const totalSales = data.length;
    const totalAmount = data.reduce((sum, order) => sum + order.total, 0);
    const totalTax = data.reduce((sum, order) => sum + order.gstAmount, 0);
    const avgSaleValue = totalSales > 0 ? totalAmount / totalSales : 0;

    setSummary({
      totalSales,
      totalAmount,
      totalTax,
      avgSaleValue,
    });
  };

  const applyFilters = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter((order) =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFrom) {
      filtered = filtered.filter((order) =>
        new Date(order.createdAt) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filtered = filtered.filter((order) =>
        new Date(order.createdAt) <= new Date(dateTo)
      );
    }

    setFilteredOrders(filtered);
  };

  const downloadReport = () => {
    const headers = ['Order #', 'Subtotal', 'GST', 'Total', 'Payment', 'Date'];
    const rows = filteredOrders.map((order) => [
      order.orderNumber,
      order.subtotal.toFixed(2),
      order.gstAmount.toFixed(2),
      order.total.toFixed(2),
      order.paymentMethod,
      new Date(order.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600 text-lg">Loading POS orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">POS Sales Report</h1>
          <p className="text-gray-600">Transaction history and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="outline" className="rounded-full">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={downloadReport} className="bg-blue-600 hover:bg-blue-700 rounded-full">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-0 shadow-md">
            <p className="text-sm text-gray-600 font-medium">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalSales}</p>
          </Card>
          <Card className="p-4 border-0 shadow-md">
            <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">Rs. {summary.totalAmount.toFixed(0)}</p>
          </Card>
          <Card className="p-4 border-0 shadow-md">
            <p className="text-sm text-gray-600 font-medium">Total GST</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">Rs. {summary.totalTax.toFixed(0)}</p>
          </Card>
          <Card className="p-4 border-0 shadow-md">
            <p className="text-sm text-gray-600 font-medium">Average Sale</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">Rs. {summary.avgSaleValue.toFixed(0)}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6 border-0 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Order #
            </label>
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="p-6 border-0 shadow-md overflow-x-auto">
        {filteredOrders.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Order #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Subtotal</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">GST</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Total</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Payment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{order.orderNumber}</td>
                  <td className="py-3 px-4 text-sm">Rs. {order.subtotal.toFixed(0)}</td>
                  <td className="py-3 px-4 text-sm">Rs. {order.gstAmount.toFixed(0)}</td>
                  <td className="py-3 px-4 text-sm font-semibold">Rs. {order.total.toFixed(0)}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {order.paymentMethod.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <Button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetail(true);
                      }}
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-500 py-8">No orders found</p>
        )}
      </Card>

      {/* Detail Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Order Details</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Order #:</span>
                <span className="font-medium">{selectedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment:</span>
                <span className="font-medium">{selectedOrder.paymentMethod.toUpperCase()}</span>
              </div>
            </div>

            <div className="border-t border-b border-gray-200 py-3 mb-6">
              <h3 className="font-semibold mb-2">Items ({selectedOrder.items.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.name || 'Item'} x{item.quantity}</span>
                    <span>Rs. {(item.subtotal || item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>Rs. {selectedOrder.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (17%):</span>
                <span>Rs. {selectedOrder.gstAmount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>Rs. {selectedOrder.total.toFixed(0)}</span>
              </div>
            </div>

            <Button
              onClick={() => setShowDetail(false)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-full"
            >
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
