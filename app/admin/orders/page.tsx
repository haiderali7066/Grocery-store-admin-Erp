"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Printer, Eye, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  paymentStatus: "pending" | "verified" | "failed";
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentMethod: string;
  createdAt: string;
  screenshot?: string;
  trackingNumber?: string;
  trackingProvider?: string;
  items: OrderItem[];
  user?: User;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<
    Record<string, { code: string; courier: string }>
  >({});
  const [updatedOrderId, setUpdatedOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

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
    if (
      !confirm(
        "Are you sure you want to delete this order? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }

      // Remove order from state
      setOrders(orders.filter((order) => order._id !== orderId));

      // Close the order panel if it was open
      if (openOrderId === orderId) {
        setOpenOrderId(null);
      }
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleApprove = (orderId: string) => {
    const code = trackingInputs[orderId]?.code || `TRK-${Date.now()}`;
    const courier = trackingInputs[orderId]?.courier || "Local Courier";
    updateOrder(orderId, {
      paymentStatus: "verified",
      orderStatus: "processing",
      trackingNumber: code,
      trackingProvider: courier,
    });
  };

  const handleReject = (orderId: string) => {
    updateOrder(orderId, { paymentStatus: "failed", orderStatus: "cancelled" });
  };

  const handleStatusUpdate = (orderId: string, status: string) => {
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
            table { border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h2>${storeInfo.name}</h2>
          <p>${storeInfo.address}</p>
          <p>Phone: ${storeInfo.phone}</p>
          <p>Email: ${storeInfo.email}</p>
          <hr/>
          <h3>Order #${order.orderNumber}</h3>
          <p>Order Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p>Payment Method: ${order.paymentMethod || "-"}</p>

          <h4>Customer Details:</h4>
          <p>Name: ${user.name || "-"}</p>
          <p>Email: ${user.email || "-"}</p>
          <p>Phone: ${user.phone || "-"}</p>
          <p>Address: ${user.address || "-"}</p>

          <h4>Order Items:</h4>
          <table border="1" width="100%" cellpadding="6">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <p>Subtotal: Rs. ${(order.subtotal ?? 0).toLocaleString()}</p>
          <p>GST: Rs. ${(order.gstAmount ?? 0).toLocaleString()}</p>
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
      verified: "bg-emerald-100 text-emerald-700 border-emerald-300",
      failed: "bg-rose-100 text-rose-700 border-rose-300",
      processing: "bg-blue-100 text-blue-700 border-blue-300",
      shipped: "bg-purple-100 text-purple-700 border-purple-300",
      delivered: "bg-green-200 text-green-900 border-green-400",
      cancelled: "bg-red-200 text-red-900 border-red-400",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Store Info */}
      <Card className="p-6 shadow-lg border bg-white">
        <h2 className="text-2xl font-bold mb-4 text-slate-700">Store Info</h2>
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

      <h1 className="text-3xl font-bold text-slate-800">Orders Management</h1>

      <Card className="p-6 shadow-xl border bg-white">
        {isLoading ? (
          <p className="text-slate-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-slate-500">No orders found</p>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
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
                        : "border-slate-200"
                    }`}
                  >
                    {/* Order Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="font-bold text-lg text-slate-800">
                          #{order.orderNumber}
                        </p>
                        <p className="text-sm text-slate-500">
                          Rs. {(order.total ?? 0).toLocaleString()} •{" "}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-medium">Payment:</span>{" "}
                          {order.paymentMethod || "N/A"}
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
                            {order.user?.address && (
                              <p className="text-xs text-slate-500">
                                {order.user.address}
                              </p>
                            )}
                            <p className="text-sm font-medium mt-2 text-slate-700">
                              Payment Method: {order.paymentMethod || "N/A"}
                            </p>
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
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, idx) => (
                                    <tr key={idx} className="border-t">
                                      <td className="p-2">
                                        {item.product?.name ||
                                          "Deleted Product"}
                                      </td>
                                      <td className="text-center">
                                        {item.quantity}
                                      </td>
                                      <td className="text-center">
                                        Rs. {(item.price ?? 0).toLocaleString()}
                                      </td>
                                      <td className="text-center">
                                        Rs.{" "}
                                        {(item.subtotal ?? 0).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-2 space-y-1 text-sm">
                              <p>
                                Subtotal: Rs.{" "}
                                {(order.subtotal ?? 0).toLocaleString()}
                              </p>
                              <p>
                                GST: Rs.{" "}
                                {(order.gstAmount ?? 0).toLocaleString()}
                              </p>
                              <p className="font-bold">
                                Total: Rs. {(order.total ?? 0).toLocaleString()}
                              </p>
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

                          {order.paymentStatus === "pending" && (
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
                                <X className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </div>
                          )}

                          <div>
                            <label className="block mb-1 font-semibold text-sm">
                              Update Status
                            </label>
                            <select
                              value={order.orderStatus}
                              onChange={(e) =>
                                handleStatusUpdate(order._id, e.target.value)
                              }
                              className="border rounded px-2 py-1 text-sm"
                            >
                              {[
                                "pending",
                                "processing",
                                "shipped",
                                "delivered",
                                "cancelled",
                              ].map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* RIGHT SIDE */}
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
                            <p className="text-slate-500 text-sm">
                              No screenshot uploaded
                            </p>
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
    </div>
  );
}
