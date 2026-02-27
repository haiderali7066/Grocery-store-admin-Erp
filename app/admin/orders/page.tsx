"use client";

// FILE PATH: app/admin/orders/page.tsx

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
  Smartphone,
  ImageIcon,
  Save,
  Loader2,
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
  name?: string;
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

interface ShippingAddress {
  fullName?: string;
  street?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  total?: number;
  subtotal?: number;
  gstAmount?: number;
  discount?: number;
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
  codDeliveryCharge?: number;
  codDeliveryScreenshot?: string | null;
  codDeliveryPaid?: boolean;
  createdAt: string;
  screenshot?: string;
  trackingNumber?: string;
  trackingProvider?: string;
  items: OrderItem[];
  user?: User;
  shippingAddress?: ShippingAddress;
}

interface StoreInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2-PAGE PRINT BUILDER
// Page 1 — Store info (top half) | Customer info (bottom half)
// Page 2 — Order number, summary bar, items table, totals
// ─────────────────────────────────────────────────────────────────────────────
function buildPrintHTML(order: Order, storeInfo: StoreInfo): string {
  const addr = order.shippingAddress || {};
  const user = order.user || {};

  const customerName  = addr.fullName  || user.name  || "—";
  const customerPhone = addr.phone     || user.phone || "—";
  const customerEmail = addr.email     || user.email || "—";
  const customerAddr  = [
    addr.street,
    addr.city,
    addr.province,
    addr.zipCode,
    addr.country,
  ].filter(Boolean).join(", ") || user.address || "—";

  const orderDate = new Date(order.createdAt).toLocaleString("en-PK");

  const itemRows = order.items.map(item => `
    <tr>
      <td>${item.name || item.product?.name || "Deleted Product"}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">Rs. ${Number(item.price ?? 0).toLocaleString()}</td>
      <td style="text-align:right">
        Rs. ${Number(item.subtotal ?? item.price * item.quantity ?? 0).toLocaleString()}
      </td>
    </tr>
  `).join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Invoice #${order.orderNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 14px; }
      h1, h2 { margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #000; padding: 6px; }
      th { background: #f2f2f2; }
      .right { text-align: right; }
      .center { text-align: center; }
      .section { margin-bottom: 15px; }
      @media print { body { margin: 20px; } }
    </style>
  </head>
  <body>

    <h1>${storeInfo.name}</h1>
    <p>${storeInfo.address}</p>
    <p>Phone: ${storeInfo.phone} | Email: ${storeInfo.email}</p>

    <hr/>

    <div class="section">
      <h2>Order Details</h2>
      <p><strong>Order #:</strong> ${order.orderNumber}</p>
      <p><strong>Date:</strong> ${orderDate}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod}</p>
    </div>

    <div class="section">
      <h2>Customer Information</h2>
      <p><strong>Name:</strong> ${customerName}</p>
      <p><strong>Phone:</strong> ${customerPhone}</p>
      <p><strong>Email:</strong> ${customerEmail}</p>
      <p><strong>Address:</strong> ${customerAddr}</p>
    </div>

    <div class="section">
      <h2>Items</h2>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th class="center">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <table>
        <tr>
          <td><strong>Subtotal</strong></td>
          <td class="right">Rs. ${(order.subtotal ?? 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>Tax</strong></td>
          <td class="right">Rs. ${(order.gstAmount ?? 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>Shipping</strong></td>
          <td class="right">
            ${(order.shippingCost ?? 0) === 0
              ? "Free"
              : `Rs. ${(order.shippingCost ?? 0).toLocaleString()}`}
          </td>
        </tr>
        <tr>
          <td><strong>Total</strong></td>
          <td class="right"><strong>Rs. ${(order.total ?? 0).toLocaleString()}</strong></td>
        </tr>
      </table>
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 300);
      };
    </script>

  </body>
  </html>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<
    Record<string, { code: string; courier: string }>
  >({});
  const [updatedOrderId, setUpdatedOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Store Info state
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: "Khas pure foods",
    address: "123 Store Street, Lahore, Pakistan",
    phone: "0300-1234567",
    email: "info@khasspurefoods.com",
  });
  const [storeInfoOriginal, setStoreInfoOriginal] = useState<StoreInfo>({ ...storeInfo });
  const [isLoadingStoreInfo, setIsLoadingStoreInfo] = useState(true);
  const [isSavingStoreInfo, setIsSavingStoreInfo] = useState(false);
  const [storeInfoChanged, setStoreInfoChanged] = useState(false);

  // COD Cash Collection Dialog State
  const [codDialogOpen, setCodDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [codAmount, setCodAmount] = useState("");
  const [codNotes, setCodNotes] = useState("");
  const [isProcessingCod, setIsProcessingCod] = useState(false);

  const [isFixing, setIsFixing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "unpaid_cod">("all");

  useEffect(() => {
    fetchStoreInfo();
    fetchOrders();
  }, []);

  const fetchStoreInfo = async () => {
    setIsLoadingStoreInfo(true);
    try {
      const res = await fetch("/api/admin/store-info");
      if (res.ok) {
        const data = await res.json();
        setStoreInfo(data.storeInfo);
        setStoreInfoOriginal(data.storeInfo);
        setStoreInfoChanged(false);
      }
    } catch (err) {
      console.error("Failed to fetch store info:", err);
    } finally {
      setIsLoadingStoreInfo(false);
    }
  };

  const handleStoreInfoChange = (key: keyof StoreInfo, value: string) => {
    const updated = { ...storeInfo, [key]: value };
    setStoreInfo(updated);
    setStoreInfoChanged(
      JSON.stringify(updated) !== JSON.stringify(storeInfoOriginal)
    );
  };

  const handleSaveStoreInfo = async () => {
    setIsSavingStoreInfo(true);
    try {
      const res = await fetch("/api/admin/store-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storeInfo),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }
      const data = await res.json();
      setStoreInfoOriginal(data.storeInfo);
      setStoreInfoChanged(false);
      alert("✅ Store info saved successfully!");
    } catch (err: any) {
      alert("❌ Failed to save: " + err.message);
    } finally {
      setIsSavingStoreInfo(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data.orders || []);
      const initialTracking: Record<string, { code: string; courier: string }> = {};
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
    if (!confirm("Update all COD orders to show unpaid status?")) return;
    setIsFixing(true);
    try {
      const res = await fetch("/api/admin/fix-cod-status", { method: "POST" });
      if (!res.ok) throw new Error("Failed to fix COD status");
      const data = await res.json();
      alert(`✅ ${data.message}\nUpdated ${data.modifiedCount} orders`);
      fetchOrders();
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
    if (!confirm("Delete this order? Stock will be restored automatically.")) return;
    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
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

  const handleApprove = async (order: Order) => {
    const isCOD = order.paymentMethod === "cod";
    const hasAdvance = (order.codDeliveryCharge || 0) > 0;
    const confirmMsg = isCOD
      ? hasAdvance
        ? `Approve Order #${order.orderNumber}?\n\n✅ This will:\n• Verify the EasyPaisa advance screenshot (Rs. ${order.codDeliveryCharge})\n• Credit Rs. ${order.codDeliveryCharge} to EasyPaisa wallet\n• Move order to processing\n\n💡 Cash remainder (Rs. ${((order.total || 0) - (order.codDeliveryCharge || 0)).toFixed(0)}) will be collected from rider separately.`
        : `Approve COD Order #${order.orderNumber}?\n\n✅ This will:\n• Move order to processing\n\n💡 No advance was paid — full amount (Rs. ${order.total}) will be collected from rider.`
      : `Approve Order #${order.orderNumber}?\n\n✅ This will add Rs. ${order.total} to your wallet and move to processing.`;

    if (!confirm(confirmMsg)) return;

    const code = trackingInputs[order._id]?.code || `TRK-${Date.now()}`;
    const courier = trackingInputs[order._id]?.courier || "Local Courier";

    try {
      const res = await fetch(`/api/admin/orders/${order._id}`, {
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
      const successMsg = isCOD
        ? hasAdvance
          ? `✅ COD order approved!\n\n💳 EasyPaisa advance Rs. ${order.codDeliveryCharge} credited to wallet\n📦 Order moved to processing\n💵 Collect Rs. ${((order.total || 0) - (order.codDeliveryCharge || 0)).toFixed(0)} from rider on delivery`
          : `✅ COD order approved!\n\n📦 Order moved to processing\n💵 Collect full Rs. ${order.total} from rider on delivery`
        : `✅ Order approved!\n\n💰 Payment added to wallet\n📦 Order moved to processing`;
      alert(successMsg);
      setUpdatedOrderId(order._id);
      fetchOrders();
      setTimeout(() => setUpdatedOrderId(null), 1500);
    } catch (err: any) {
      alert("Update failed: " + err.message);
    }
  };

  const handleReject = (orderId: string) => {
    if (!confirm("Reject this order? Stock will be restored automatically.")) return;
    updateOrder(orderId, { paymentStatus: "failed", orderStatus: "cancelled" });
  };

  const handleStatusUpdate = (orderId: string, status: string) => {
    if (status === "cancelled") {
      if (!confirm("Cancel this order? Stock will be restored automatically.")) return;
    }
    updateOrder(orderId, { orderStatus: status });
  };

  const handleTrackingChange = (orderId: string, field: string, value: string) => {
    setTrackingInputs((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }));
  };

  const handleTrackingSave = (orderId: string) => {
    const { code, courier } = trackingInputs[orderId] || {};
    updateOrder(orderId, { trackingNumber: code || "", trackingProvider: courier || "" });
  };

  const handleCodPaymentClick = (order: Order) => {
    const cashDue = (order.total || 0) - (order.codDeliveryCharge || 0);
    setSelectedOrder(order);
    setCodAmount(cashDue.toString());
    setCodNotes("");
    setCodDialogOpen(true);
  };

  const handleMarkCodPaid = async () => {
    if (!selectedOrder) return;
    const amount = parseFloat(codAmount);
    if (isNaN(amount) || amount <= 0) { alert("Please enter a valid amount"); return; }

    setIsProcessingCod(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder._id}/mark-cod-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes: codNotes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to mark as paid");
      }
      const data = await res.json();
      alert(
        `✅ ${data.message}\n\n💰 Profit: Rs. ${data.profit}\n💵 Cash Balance: Rs. ${data.walletCashBalance?.toLocaleString()}`,
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

  // ── 2-page print: opens a new tab, auto-prints, then closes ──────────────
  const handlePrint = (order: Order) => {
    const html = buildPrintHTML(order, storeInfo);
    const win = window.open("", "_blank", "width=900,height=750");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site to print.");
      return;
    }
    win.document.write(html);
    win.document.close();
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "unpaid_cod") {
      return (
        order.paymentMethod === "cod" &&
        (order.codPaymentStatus === "unpaid" || !order.codPaymentStatus)
      );
    }
    return true;
  });

  const unpaidCodOrders = orders.filter(
    (o) => o.paymentMethod === "cod" && (o.codPaymentStatus === "unpaid" || !o.codPaymentStatus),
  );
  const unpaidCodTotal = unpaidCodOrders.reduce(
    (sum, o) => sum + (o.total || 0) - (o.codDeliveryCharge || 0),
    0,
  );
  const needsFixing = orders.some((o) => o.paymentMethod === "cod" && !o.codPaymentStatus);

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">

      {/* Store Info */}
      <Card className="p-6 shadow-lg border bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-700">Store Info (for invoices)</h2>
          {storeInfoChanged && (
            <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
              ⚠️ Unsaved changes
            </span>
          )}
        </div>
        {isLoadingStoreInfo ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {(["name", "address", "phone", "email"] as const).map((key) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    {key === "name" ? "Store Name" : key === "address" ? "Store Address" : key === "phone" ? "Phone Number" : "Email Address"}
                  </label>
                  <Input
                    value={storeInfo[key]}
                    onChange={(e) => handleStoreInfoChange(key, e.target.value)}
                    className="bg-slate-50"
                  />
                </div>
              ))}
            </div>
            {storeInfoChanged && (
              <Button
                onClick={handleSaveStoreInfo}
                disabled={isSavingStoreInfo}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {isSavingStoreInfo ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Store Info</>
                )}
              </Button>
            )}
          </>
        )}
      </Card>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Orders Management</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Card className="bg-orange-50 border-orange-200 p-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-xs text-orange-600 font-medium">Cash to Collect (COD)</p>
                <p className="text-2xl font-bold text-orange-900">Rs. {unpaidCodTotal.toLocaleString()}</p>
                <p className="text-xs text-orange-600">{unpaidCodOrders.length} orders</p>
              </div>
            </div>
          </Card>
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <RotateCcw className="h-4 w-4 text-blue-500" />
            <span>Stock auto-restores on cancel/reject/delete</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            onClick={() => setFilterStatus("all")}
            className={filterStatus === "all" ? "bg-green-700 hover:bg-green-800" : ""}
          >
            All Orders ({orders.length})
          </Button>
          <Button
            variant={filterStatus === "unpaid_cod" ? "default" : "outline"}
            onClick={() => setFilterStatus("unpaid_cod")}
            className={filterStatus === "unpaid_cod" ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            <Banknote className="h-4 w-4 mr-2" />
            Unpaid COD ({unpaidCodOrders.length})
          </Button>
        </div>
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

      {/* Orders List */}
      <Card className="p-6 shadow-xl border bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            {filterStatus === "unpaid_cod" ? "No unpaid COD orders" : "No orders found"}
          </p>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const isCOD = order.paymentMethod === "cod";
              const hasAdvance = (order.codDeliveryCharge || 0) > 0;
              const cashDue = (order.total || 0) - (order.codDeliveryCharge || 0);

              return (
                <AnimatePresence key={order._id}>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card
                      className={`p-5 border transition-all ${
                        updatedOrderId === order._id
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : isCOD && (order.codPaymentStatus === "unpaid" || !order.codPaymentStatus)
                          ? "border-orange-300 bg-orange-50/30"
                          : "border-slate-200"
                      }`}
                    >
                      {/* Order Header Row */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-lg text-slate-800">#{order.orderNumber}</p>
                            {isCOD && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-semibold">
                                COD
                              </span>
                            )}
                            {isCOD && hasAdvance && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                <Smartphone className="h-3 w-3" />
                                Rs. {order.codDeliveryCharge} advance paid
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
                            {isCOD && hasAdvance && (
                              <span className="ml-2 text-orange-600 font-semibold">
                                (Collect Rs. {cashDue.toFixed(0)} on delivery)
                              </span>
                            )}
                          </p>
                          {order.user?.phone && (
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Phone:</span> {order.user.phone}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {badge(order.paymentStatus)}
                          {badge(order.orderStatus)}
                          {isCOD && order.codPaymentStatus && badge(order.codPaymentStatus)}

                          {isCOD &&
                            (order.codPaymentStatus === "unpaid" || !order.codPaymentStatus) &&
                            order.paymentStatus === "verified" && (
                              <Button
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => handleCodPaymentClick(order)}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Collect Cash{hasAdvance && ` (Rs. ${cashDue.toFixed(0)})`}
                              </Button>
                            )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setOpenOrderId(openOrderId === order._id ? null : order._id)}
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
                            {deletingOrderId === order._id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Panel */}
                      {openOrderId === order._id && (
                        <div className="mt-6 border-t pt-6 grid lg:grid-cols-2 gap-8">
                          {/* LEFT */}
                          <div className="space-y-6">
                            <section>
                              <h3 className="font-semibold text-slate-700 mb-2">Customer Info</h3>
                              <p className="text-sm">{order.user?.name || order.shippingAddress?.fullName || "-"}</p>
                              <p className="text-xs text-slate-500">{order.user?.email || order.shippingAddress?.email || "-"}</p>
                              <p className="text-xs text-slate-500">{order.user?.phone || order.shippingAddress?.phone || "-"}</p>
                              {order.shippingAddress?.street && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {[order.shippingAddress.street, order.shippingAddress.city, order.shippingAddress.province]
                                    .filter(Boolean).join(", ")}
                                </p>
                              )}
                              <p className="text-sm font-medium mt-2 text-slate-700">
                                Payment: {order.paymentMethod?.toUpperCase() || "N/A"}
                              </p>
                              {isCOD && (
                                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                                  {hasAdvance ? (
                                    <>
                                      <p className="text-sm font-bold text-orange-900">Hybrid COD</p>
                                      <div className="text-xs space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-green-700 flex items-center gap-1">
                                            <Smartphone className="h-3 w-3" /> EasyPaisa advance
                                          </span>
                                          <span className={`font-bold ${order.codDeliveryPaid ? "text-green-700" : "text-orange-600"}`}>
                                            Rs. {order.codDeliveryCharge}{" "}
                                            {order.codDeliveryPaid ? "✓ verified" : "⏳ pending"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-orange-700 flex items-center gap-1">
                                            <Banknote className="h-3 w-3" /> Cash on delivery
                                          </span>
                                          <span className={`font-bold ${order.codPaymentStatus === "paid" ? "text-green-700" : "text-orange-600"}`}>
                                            Rs. {cashDue.toFixed(0)}{" "}
                                            {order.codPaymentStatus === "paid" ? "✓ collected" : "⏳ pending"}
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-sm font-semibold text-orange-900">
                                      COD Status: {order.codPaymentStatus === "paid" ? "✓ PAID" : "⏱ UNPAID"}
                                    </p>
                                  )}
                                  {order.codPaymentStatus === "paid" && order.codPaidAt && (
                                    <p className="text-xs text-orange-700">
                                      Collected: {new Date(order.codPaidAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </section>

                            <section>
                              <h3 className="font-semibold text-slate-700 mb-2">Order Items</h3>
                              <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-100 text-slate-600">
                                    <tr>
                                      <th className="p-2 text-left">Item</th>
                                      <th className="p-2 text-center">Qty</th>
                                      <th className="p-2 text-center">Price</th>
                                      <th className="p-2 text-center">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map((item, idx) => (
                                      <tr key={idx} className="border-t">
                                        <td className="p-2">{item.name || item.product?.name || "Deleted Product"}</td>
                                        <td className="p-2 text-center">{item.quantity}</td>
                                        <td className="p-2 text-center">Rs. {(item.price ?? 0).toLocaleString()}</td>
                                        <td className="p-2 text-center">Rs. {(item.subtotal ?? 0).toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-3 space-y-1 text-sm bg-slate-50 rounded-lg p-3">
                                <div className="flex justify-between"><span>Subtotal</span><span>Rs. {(order.subtotal ?? 0).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>GST</span><span>Rs. {(order.gstAmount ?? 0).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Shipping</span><span>Rs. {(order.shippingCost ?? 0).toLocaleString()}</span></div>
                                {hasAdvance && (
                                  <>
                                    <div className="flex justify-between text-green-700 border-t pt-1">
                                      <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" />Advance paid</span>
                                      <span>− Rs. {order.codDeliveryCharge}</span>
                                    </div>
                                    <div className="flex justify-between text-orange-700">
                                      <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />Cash to collect</span>
                                      <span className="font-bold">Rs. {cashDue.toFixed(0)}</span>
                                    </div>
                                  </>
                                )}
                                <div className="flex justify-between font-bold border-t pt-1">
                                  <span>Total</span>
                                  <span>Rs. {(order.total ?? 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </section>

                            <section>
                              <h3 className="font-semibold text-slate-700 mb-2">Tracking Info</h3>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Tracking Number"
                                  value={trackingInputs[order._id]?.code || ""}
                                  onChange={(e) => handleTrackingChange(order._id, "code", e.target.value)}
                                />
                                <Input
                                  placeholder="Courier"
                                  value={trackingInputs[order._id]?.courier || ""}
                                  onChange={(e) => handleTrackingChange(order._id, "courier", e.target.value)}
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

                            {order.paymentStatus === "pending" && (
                              <div className="flex gap-3">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(order)}>
                                  <Check className="w-4 h-4 mr-1" />
                                  {isCOD ? "Verify & Process" : "Approve"}
                                </Button>
                                <Button variant="destructive" onClick={() => handleReject(order._id)}>
                                  <X className="w-4 h-4 mr-1" /> Reject & Restock
                                </Button>
                              </div>
                            )}

                            <div>
                              <label className="block mb-1 font-semibold text-sm text-slate-700">
                                Update Order Status
                              </label>
                              <select
                                value={order.orderStatus}
                                onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                                className="border rounded px-3 py-2 text-sm w-full max-w-xs"
                              >
                                {["pending","confirmed","processing","shipped","delivered","cancelled"].map((s) => (
                                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                              </select>
                              {["cancelled","failed"].includes(order.orderStatus) && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <RotateCcw className="h-3 w-3" /> Stock has been automatically restored
                                </p>
                              )}
                            </div>
                          </div>

                          {/* RIGHT — Payment Screenshots */}
                          <div className="space-y-6">
                            {isCOD && hasAdvance && (
                              <section>
                                <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                  <Smartphone className="h-4 w-4 text-green-600" />
                                  EasyPaisa Advance Screenshot
                                  <span className="text-xs font-normal text-slate-500">(Rs. {order.codDeliveryCharge})</span>
                                </h3>
                                {order.codDeliveryScreenshot ? (
                                  <div>
                                    <img
                                      src={order.codDeliveryScreenshot}
                                      alt="EasyPaisa Advance"
                                      className="rounded-lg border max-h-80 object-contain hover:scale-105 transition w-full cursor-zoom-in"
                                      onClick={() => window.open(order.codDeliveryScreenshot!, "_blank")}
                                    />
                                    <div className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 w-fit ${order.codDeliveryPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                      {order.codDeliveryPaid ? "✓ Advance verified & credited" : "⏳ Pending — click Verify & Process to confirm"}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border-2 border-dashed border-orange-200 rounded-lg p-6 text-center text-orange-400">
                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No EasyPaisa screenshot uploaded</p>
                                  </div>
                                )}
                              </section>
                            )}

                            {isCOD && !hasAdvance && (
                              <section>
                                <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                  <Banknote className="h-4 w-4 text-orange-600" /> Payment Proof
                                </h3>
                                <div className="border-2 border-dashed border-orange-200 rounded-lg p-8 text-center">
                                  <Banknote className="h-10 w-10 mx-auto mb-3 text-orange-300" />
                                  <p className="text-sm font-semibold text-orange-700">Cash on Delivery — No screenshot required</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Full amount of Rs. {(order.total ?? 0).toLocaleString()} collected in cash on delivery
                                  </p>
                                </div>
                              </section>
                            )}

                            {!isCOD && (
                              <section>
                                <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4 text-slate-500" /> Payment Proof
                                </h3>
                                {order.screenshot ? (
                                  <img
                                    src={order.screenshot}
                                    alt="Payment Screenshot"
                                    className="rounded-lg border max-h-96 object-contain hover:scale-105 transition w-full cursor-zoom-in"
                                    onClick={() => window.open(order.screenshot!, "_blank")}
                                  />
                                ) : (
                                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400">
                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No screenshot uploaded</p>
                                  </div>
                                )}
                              </section>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                </AnimatePresence>
              );
            })}
          </div>
        )}
      </Card>

      {/* COD Cash Collection Dialog */}
      <Dialog open={codDialogOpen} onOpenChange={setCodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Cash Collection</DialogTitle>
            <DialogDescription>
              Confirm cash received from rider for order{" "}
              <span className="font-bold">#{selectedOrder?.orderNumber}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(selectedOrder?.codDeliveryCharge || 0) > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm space-y-1">
                <p className="font-bold text-orange-900">Payment Breakdown</p>
                <div className="flex justify-between text-green-700">
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5" /> Already collected (EasyPaisa advance)
                  </span>
                  <span className="font-semibold">Rs. {selectedOrder?.codDeliveryCharge}</span>
                </div>
                <div className="flex justify-between text-orange-700 font-bold">
                  <span className="flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5" /> Cash from rider (enter below)
                  </span>
                  <span>Rs. {((selectedOrder?.total || 0) - (selectedOrder?.codDeliveryCharge || 0)).toFixed(0)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 text-slate-700">
                  <span>Order Total</span>
                  <span className="font-bold">Rs. {(selectedOrder?.total || 0).toLocaleString()}</span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cash Amount Received from Rider (Rs) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={codAmount}
                onChange={(e) => setCodAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <Textarea
                value={codNotes}
                onChange={(e) => setCodNotes(e.target.value)}
                placeholder="e.g., Collected from TCS Courier on 2024-01-15"
                rows={3}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 Rs. {codAmount || "0"} will be added to your <strong>Cash wallet</strong>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodDialogOpen(false)} disabled={isProcessingCod}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleMarkCodPaid} disabled={isProcessingCod}>
              {isProcessingCod ? "Processing..." : "Confirm Cash Collected"}
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