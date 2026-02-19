"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  X,
  Printer,
  Eye,
  Trash2,
  RotateCcw,
  DollarSign,
  Banknote,
  Wrench,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PermissionGuard from "@/components/admin/PermissionGuard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface OrderItem {
  product: { name: string } | null;
  quantity: number;
  price: number;
  subtotal: number;
}

interface User {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  total?: number;
  subtotal?: number;
  gstAmount?: number;
  shippingCost?: number;
  paymentStatus: "pending" | "verified" | "failed";
  orderStatus:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  paymentMethod: string;
  codPaymentStatus?: "unpaid" | "paid" | null;
  codPaidAt?: string;
  createdAt: string;
  screenshot?: string;
  trackingNumber?: string;
  trackingProvider?: string;
  items: OrderItem[];
  user?: User;
}

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<
    Record<string, { code: string; courier: string }>
  >({});
  const [updatedOrderId, setUpdatedOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // COD Payment Dialog State
  const [codDialogOpen, setCodDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [codAmount, setCodAmount] = useState("");
  const [codNotes, setCodNotes] = useState("");
  const [isProcessingCod, setIsProcessingCod] = useState(false);

  // Fix COD Status State
  const [isFixing, setIsFixing] = useState(false);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<"all" | "unpaid_cod">("all");

  const [storeInfo, setStoreInfo] = useState({
    name: "Khas pure foods",
    address: "123 Store Street, Lahore, Pakistan",
    phone: "0300-1234567",
    email: "info@khasspurefoods.com",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data.orders || []);

      const initialTracking: Record<string, { code: string; courier: string }> =
        {};
      data.orders?.forEach((o: Order) => {
        initialTracking[o._id] = {
          code: o.trackingNumber || "",
          courier: o.trackingProvider || "",
        };
      });
      setTrackingInputs(initialTracking);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixCodStatus = async () => {
    if (
      !confirm(
        "Update all COD orders to show unpaid status? This will fix missing COD payment status.",
      )
    )
      return;

    setIsFixing(true);
    try {
      const res = await fetch("/api/admin/fix-cod-status", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to fix COD status");
      }

      const data = await res.json();
      alert(`✅ ${data.message}\nUpdated ${data.modifiedCount} orders`);
      fetchOrders(); // Refresh the list
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setIsFixing(false);
    }
  };

  const updateOrder = async (id: string, body: any) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      setUpdatedOrderId(id);
      fetchOrders();
      setTimeout(() => setUpdatedOrderId(null), 1500);
    } catch (err: any) {
      alert("Update failed: " + err.message);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Delete this order? Stock will be restored automatically."))
      return;

    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }

      const data = await res.json();
      alert(data.message);
      setOrders(orders.filter((order) => order._id !== orderId));
      if (openOrderId === orderId) setOpenOrderId(null);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeletingOrderId(null);
    }
  };

  // app/admin/orders/page.tsx - Update the handleApprove function

  const handleApprove = async (orderId: string) => {
    const code = trackingInputs[orderId]?.code || `TRK-${Date.now()}`;
    const courier = trackingInputs[orderId]?.courier || "Local Courier";

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "verified",
          orderStatus: "processing",
          trackingNumber: code,
          trackingProvider: courier,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      const data = await res.json();

      // Show success message
      alert(
        `✅ Order approved successfully!\n\n💰 Payment added to wallet\n📦 Order moved to processing`,
      );

      setUpdatedOrderId(orderId);
      fetchOrders();
      setTimeout(() => setUpdatedOrderId(null), 1500);
    } catch (err: any) {
      alert("Update failed: " + err.message);
    }
  };

  const handleReject = (orderId: string) => {
    if (!confirm("Reject this order? Stock will be restored automatically."))
      return;
    updateOrder(orderId, {
      paymentStatus: "failed",
      orderStatus: "cancelled",
    });
  };

  const handleStatusUpdate = (orderId: string, status: string) => {
    if (status === "cancelled") {
      if (!confirm("Cancel this order? Stock will be restored automatically."))
        return;
    }
    updateOrder(orderId, { orderStatus: status });
  };

  const handleTrackingChange = (
    orderId: string,
    field: string,
    value: string,
  ) => {
    setTrackingInputs((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }));
  };

  const handleTrackingSave = (orderId: string) => {
    const { code, courier } = trackingInputs[orderId] || {};
    updateOrder(orderId, {
      trackingNumber: code || "",
      trackingProvider: courier || "",
    });
  };

  // COD Payment Handling
  const handleCodPaymentClick = (order: Order) => {
    setSelectedOrder(order);
    setCodAmount(order.total?.toString() || "");
    setCodNotes("");
    setCodDialogOpen(true);
  };

  const handleMarkCodPaid = async () => {
    if (!selectedOrder) return;

    const amount = parseFloat(codAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsProcessingCod(true);
    try {
      const res = await fetch(
        `/api/admin/orders/${selectedOrder._id}/mark-cod-paid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            notes: codNotes,
          }),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to mark as paid");
      }

      const data = await res.json();
      alert(
        `✅ ${data.message}\n\n💰 Profit: Rs. ${data.profit}\n💵 Cash Balance: Rs. ${data.walletBalance.toLocaleString()}`,
      );
      setCodDialogOpen(false);
      setSelectedOrder(null);
      setCodAmount("");
      setCodNotes("");
      fetchOrders();
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setIsProcessingCod(false);
    }
  };

  const handlePrint = (order: Order) => {
    const itemsRows = order.items
      .map(
        (item) => `<tr>
          <td>${item.product?.name || "Deleted Product"}</td>
          <td>${item.quantity}</td>
          <td>Rs. ${(item.price ?? 0).toLocaleString()}</td>
          <td>Rs. ${(item.subtotal ?? 0).toLocaleString()}</td>
        </tr>`,
      )
      .join("");

    const user = order.user || {};
    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h2>${storeInfo.name}</h2>
          <p>${storeInfo.address}</p>
          <p>Phone: ${storeInfo.phone} | Email: ${storeInfo.email}</p>
          <hr/>
          <h3>Order #${order.orderNumber}</h3>
          <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p>Payment Method: ${order.paymentMethod?.toUpperCase() || "-"}</p>
          ${order.paymentMethod === "cod" ? `<p>COD Status: ${order.codPaymentStatus === "paid" ? "PAID" : "UNPAID"}</p>` : ""}
          <p>Payment Status: ${order.paymentStatus}</p>
          <p>Order Status: ${order.orderStatus}</p>
          <h4>Customer:</h4>
          <p>${user.name || "-"} | ${user.email || "-"} | ${user.phone || "-"}</p>
          <h4>Items:</h4>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <br/>
          <p>Subtotal: Rs. ${(order.subtotal ?? 0).toLocaleString()}</p>
          <p>GST: Rs. ${(order.gstAmount ?? 0).toLocaleString()}</p>
          <p>Shipping: Rs. ${(order.shippingCost ?? 0).toLocaleString()}</p>
          <p><strong>Total: Rs. ${(order.total ?? 0).toLocaleString()}</strong></p>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  const badge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
      confirmed: "bg-blue-100 text-blue-700 border-blue-300",
      verified: "bg-emerald-100 text-emerald-700 border-emerald-300",
      failed: "bg-rose-100 text-rose-700 border-rose-300",
      processing: "bg-indigo-100 text-indigo-700 border-indigo-300",
      shipped: "bg-purple-100 text-purple-700 border-purple-300",
      delivered: "bg-green-200 text-green-900 border-green-400",
      cancelled: "bg-red-200 text-red-900 border-red-400",
      unpaid: "bg-orange-100 text-orange-700 border-orange-300",
      paid: "bg-green-100 text-green-700 border-green-300",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || "bg-gray-100 text-gray-600"}`}
      >
        {status}
      </span>
    );
  };

  // Filter orders - handle null/undefined codPaymentStatus
  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "unpaid_cod") {
      // Show COD orders that are unpaid OR don't have codPaymentStatus set yet
      return (
        order.paymentMethod === "cod" &&
        (order.codPaymentStatus === "unpaid" || !order.codPaymentStatus)
      );
    }
    return true;
  });

  // Calculate unpaid COD total - include orders without codPaymentStatus
  const unpaidCodOrders = orders.filter(
    (o) =>
      o.paymentMethod === "cod" &&
      (o.codPaymentStatus === "unpaid" || !o.codPaymentStatus),
  );
  const unpaidCodTotal = unpaidCodOrders.reduce(
    (sum, o) => sum + (o.total || 0),
    0,
  );

  // Check if there are COD orders that need fixing
  const needsFixing = orders.some(
    (o) => o.paymentMethod === "cod" && !o.codPaymentStatus,
  );

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Store Info */}
      <Card className="p-6 shadow-lg border bg-white">
        <h2 className="text-2xl font-bold mb-4 text-slate-700">
          Store Info (for invoices)
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.keys(storeInfo).map((key) => (
            <Input
              key={key}
              value={storeInfo[key as keyof typeof storeInfo]}
              onChange={(e) =>
                setStoreInfo({ ...storeInfo, [key]: e.target.value })
              }
              placeholder={key}
              className="bg-slate-50"
            />
          ))}
        </div>
      </Card>

      {/* Header with COD Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Orders Management</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Unpaid COD Summary */}
          <Card className="bg-orange-50 border-orange-200 p-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-xs text-orange-600 font-medium">
                  Unpaid COD Orders
                </p>
                <p className="text-2xl font-bold text-orange-900">
                  Rs. {unpaidCodTotal.toLocaleString()}
                </p>
                <p className="text-xs text-orange-600">
                  {unpaidCodOrders.length} orders
                </p>
              </div>
            </div>
          </Card>

          {/* Stock Restore Info */}
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <RotateCcw className="h-4 w-4 text-blue-500" />
            <span>Stock auto-restores on cancel/reject/delete</span>
          </div>
        </div>
      </div>

      {/* Filters and Fix Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            onClick={() => setFilterStatus("all")}
            className={
              filterStatus === "all" ? "bg-green-700 hover:bg-green-800" : ""
            }
          >
            All Orders ({orders.length})
          </Button>
          <Button
            variant={filterStatus === "unpaid_cod" ? "default" : "outline"}
            onClick={() => setFilterStatus("unpaid_cod")}
            className={
              filterStatus === "unpaid_cod"
                ? "bg-orange-600 hover:bg-orange-700"
                : ""
            }
          >
            <Banknote className="h-4 w-4 mr-2" />
            Unpaid COD ({unpaidCodOrders.length})
          </Button>
        </div>

        {/* Fix COD Status Button - Shows if there are COD orders without status */}
        {needsFixing && (
          <Button
            variant="outline"
            onClick={handleFixCodStatus}
            disabled={isFixing}
            className="bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
          >
            <Wrench className="h-4 w-4 mr-2" />
            {isFixing ? "Fixing..." : "Fix COD Status"}
          </Button>
        )}
      </div>

      <Card className="p-6 shadow-xl border bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            {filterStatus === "unpaid_cod"
              ? "No unpaid COD orders"
              : "No orders found"}
          </p>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => (
              <AnimatePresence key={order._id}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card
                    className={`p-5 border transition-all ${
                      updatedOrderId === order._id
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : order.paymentMethod === "cod" &&
                            (order.codPaymentStatus === "unpaid" ||
                              !order.codPaymentStatus)
                          ? "border-orange-300 bg-orange-50/30"
                          : "border-slate-200"
                    }`}
                  >
                    {/* Order Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg text-slate-800">
                            #{order.orderNumber}
                          </p>
                          {order.paymentMethod === "cod" && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                              COD
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          Rs. {(order.total ?? 0).toLocaleString()} •{" "}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-medium">Payment:</span>{" "}
                          {order.paymentMethod?.toUpperCase() || "N/A"}
                        </p>
                        {order.user?.phone && (
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Phone:</span>{" "}
                            {order.user.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {badge(order.paymentStatus)}
                        {badge(order.orderStatus)}
                        {order.paymentMethod === "cod" &&
                          order.codPaymentStatus &&
                          badge(order.codPaymentStatus)}

                        {/* Mark COD as Paid Button */}
                        {order.paymentMethod === "cod" &&
                          (order.codPaymentStatus === "unpaid" ||
                            !order.codPaymentStatus) && (
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                              onClick={() => handleCodPaymentClick(order)}
                            >
                              <DollarSign className="w-4 h-4 mr-1" /> Mark Paid
                            </Button>
                          )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setOpenOrderId(
                              openOrderId === order._id ? null : order._id,
                            )
                          }
                        >
                          <Eye className="w-4 h-4 mr-1" /> Manage
                        </Button>

                        <Button
                          size="sm"
                          className="bg-slate-800 hover:bg-slate-900 text-white"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="w-4 h-4 mr-1" /> Print
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(order._id)}
                          disabled={deletingOrderId === order._id}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {deletingOrderId === order._id
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Panel */}
                    {openOrderId === order._id && (
                      <div className="mt-6 border-t pt-6 grid lg:grid-cols-2 gap-8">
                        {/* LEFT SIDE */}
                        <div className="space-y-6">
                          <section>
                            <h3 className="font-semibold text-slate-700 mb-2">
                              Customer Info
                            </h3>
                            <p className="text-sm">{order.user?.name || "-"}</p>
                            <p className="text-xs text-slate-500">
                              {order.user?.email || "-"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {order.user?.phone || "-"}
                            </p>
                            <p className="text-sm font-medium mt-2 text-slate-700">
                              Payment:{" "}
                              {order.paymentMethod?.toUpperCase() || "N/A"}
                            </p>
                            {order.paymentMethod === "cod" && (
                              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <p className="text-sm font-semibold text-orange-900">
                                  COD Status:{" "}
                                  {order.codPaymentStatus === "paid"
                                    ? "✓ PAID"
                                    : "⏱ UNPAID"}
                                </p>
                                {order.codPaymentStatus === "paid" &&
                                  order.codPaidAt && (
                                    <p className="text-xs text-orange-700 mt-1">
                                      Received on:{" "}
                                      {new Date(
                                        order.codPaidAt,
                                      ).toLocaleString()}
                                    </p>
                                  )}
                              </div>
                            )}
                          </section>

                          <section>
                            <h3 className="font-semibold text-slate-700 mb-2">
                              Order Items
                            </h3>
                            <div className="overflow-x-auto rounded-lg border">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-slate-600">
                                  <tr>
                                    <th className="p-2 text-left">Item</th>
                                    <th className="p-2 text-center">Qty</th>
                                    <th className="p-2 text-center">Price</th>
                                    <th className="p-2 text-center">
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, idx) => (
                                    <tr key={idx} className="border-t">
                                      <td className="p-2">
                                        {item.product?.name ||
                                          "Deleted Product"}
                                      </td>
                                      <td className="p-2 text-center">
                                        {item.quantity}
                                      </td>
                                      <td className="p-2 text-center">
                                        Rs. {(item.price ?? 0).toLocaleString()}
                                      </td>
                                      <td className="p-2 text-center">
                                        Rs.{" "}
                                        {(item.subtotal ?? 0).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-3 space-y-1 text-sm bg-slate-50 rounded-lg p-3">
                              <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>
                                  Rs. {(order.subtotal ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>GST</span>
                                <span>
                                  Rs. {(order.gstAmount ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>
                                  Rs.{" "}
                                  {(order.shippingCost ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between font-bold border-t pt-1">
                                <span>Total</span>
                                <span>
                                  Rs. {(order.total ?? 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h3 className="font-semibold text-slate-700 mb-2">
                              Tracking Info
                            </h3>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Tracking Number"
                                value={trackingInputs[order._id]?.code || ""}
                                onChange={(e) =>
                                  handleTrackingChange(
                                    order._id,
                                    "code",
                                    e.target.value,
                                  )
                                }
                              />
                              <Input
                                placeholder="Courier"
                                value={trackingInputs[order._id]?.courier || ""}
                                onChange={(e) =>
                                  handleTrackingChange(
                                    order._id,
                                    "courier",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <Button
                              size="sm"
                              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleTrackingSave(order._id)}
                            >
                              Save Tracking
                            </Button>
                          </section>

                          {/* Approve / Reject (only for non-COD pending) */}
                          {order.paymentStatus === "pending" &&
                            order.paymentMethod !== "cod" && (
                              <div className="flex gap-3">
                                <Button
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleApprove(order._id)}
                                >
                                  <Check className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleReject(order._id)}
                                >
                                  <X className="w-4 h-4 mr-1" /> Reject &
                                  Restock
                                </Button>
                              </div>
                            )}

                          {/* Status Update */}
                          <div>
                            <label className="block mb-1 font-semibold text-sm text-slate-700">
                              Update Order Status
                            </label>
                            <select
                              value={order.orderStatus}
                              onChange={(e) =>
                                handleStatusUpdate(order._id, e.target.value)
                              }
                              className="border rounded px-3 py-2 text-sm w-full max-w-xs"
                            >
                              {[
                                "pending",
                                "confirmed",
                                "processing",
                                "shipped",
                                "delivered",
                                "cancelled",
                              ].map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                            {["cancelled", "failed"].includes(
                              order.orderStatus,
                            ) && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" />
                                Stock has been automatically restored
                              </p>
                            )}
                          </div>
                        </div>

                        {/* RIGHT SIDE - Payment Screenshot */}
                        <div>
                          <h3 className="font-semibold text-slate-700 mb-2">
                            Payment Proof
                          </h3>
                          {order.screenshot ? (
                            <img
                              src={order.screenshot}
                              alt="Payment Screenshot"
                              className="rounded-lg border max-h-96 object-contain hover:scale-105 transition"
                            />
                          ) : (
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400">
                              {order.paymentMethod === "cod"
                                ? "Cash on Delivery — No screenshot needed"
                                : "No screenshot uploaded"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              </AnimatePresence>
            ))}
          </div>
        )}
      </Card>

      {/* COD Payment Dialog */}
      <Dialog open={codDialogOpen} onOpenChange={setCodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark COD Payment as Received</DialogTitle>
            <DialogDescription>
              Record that you have received COD payment for order{" "}
              <span className="font-bold">#{selectedOrder?.orderNumber}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Received (Rs) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={codAmount}
                onChange={(e) => setCodAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">
                Order Total: Rs. {(selectedOrder?.total || 0).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <Textarea
                value={codNotes}
                onChange={(e) => setCodNotes(e.target.value)}
                placeholder="e.g., Collected from TCS Courier on 2024-01-15"
                rows={3}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 This will add Rs. {codAmount || "0"} to your Cash wallet and
                mark the order as paid.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCodDialogOpen(false)}
              disabled={isProcessingCod}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleMarkCodPaid}
              disabled={isProcessingCod}
            >
              {isProcessingCod ? "Processing..." : "Mark as Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <PermissionGuard permission="orders">
      <OrdersContent />
    </PermissionGuard>
  );
}
