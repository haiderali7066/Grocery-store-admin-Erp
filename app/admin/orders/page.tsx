"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Printer, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OrderItem {
  product: { name: string };
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  gstAmount: number;
  paymentStatus: "pending" | "verified" | "failed";
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentMethod: string;
  createdAt: string;
  paymentScreenshot?: string;
  trackingNumber?: string;
  trackingProvider?: string;
  items: OrderItem[];
  user?: { name: string; email: string; phone: string };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<{
    [key: string]: { code?: string; courier?: string };
  }>({});
  const [updatedOrderId, setUpdatedOrderId] = useState<string | null>(null);

  // Editable store info
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

      const initialTracking: any = {};
      data.orders?.forEach((o: Order) => {
        if (o.trackingNumber || o.trackingProvider) {
          initialTracking[o._id] = {
            code: o.trackingNumber || "",
            courier: o.trackingProvider || "",
          };
        }
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
      console.error(err);
      alert("Update failed: " + err.message);
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
    field: "code" | "courier",
    value: string,
  ) => {
    setTrackingInputs((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }));
  };

  const handleTrackingSave = (orderId: string) => {
    const code = trackingInputs[orderId]?.code || "";
    const courier = trackingInputs[orderId]?.courier || "";
    updateOrder(orderId, {
      trackingNumber: code,
      trackingProvider: courier,
    });
  };

  const handlePrint = (order: Order) => {
    const itemsRows = order.items
      .map(
        (item) =>
          `<tr>
            <td>${item.product.name}</td>
            <td>${item.quantity}</td>
            <td>Rs. ${item.price.toFixed(0)}</td>
            <td>Rs. ${item.subtotal.toFixed(0)}</td>
          </tr>`,
      )
      .join("");

    const printContent = `
      <html>
      <head>
        <title>Order ${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2, h3 { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          hr { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h2>${storeInfo.name}</h2>
        <p>${storeInfo.address}</p>
        <p>Phone: ${storeInfo.phone} | Email: ${storeInfo.email}</p>
        <hr />
        <h3>Order #: ${order.orderNumber}</h3>
        <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p>Payment Method: ${order.paymentMethod}</p>
        <p>Customer: ${order.user?.name}</p>
        <p>Email: ${order.user?.email} | Phone: ${order.user?.phone}</p>
        <p>Tracking: ${order.trackingNumber || "-"} via ${order.trackingProvider || "-"}</p>
        <p>Status: ${order.orderStatus} | Payment: ${order.paymentStatus}</p>
        <hr />
        <table>
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
        <hr />
        <p>Subtotal: Rs. ${order.subtotal.toLocaleString()}</p>
        <p>GST: Rs. ${order.gstAmount.toLocaleString()}</p>
        <p><strong>Total: Rs. ${order.total.toLocaleString()}</strong></p>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.focus();
      w.print();
    }
  };

  const badge = (status: string) => {
    const styles: any = {
      pending: "bg-yellow-100 text-yellow-800",
      verified: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-200 text-green-900",
      cancelled: "bg-red-200 text-red-900",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${
          styles[status] || "bg-gray-100"
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Editable Store Info */}
      <Card className="p-4 shadow bg-gray-50">
        <h2 className="text-xl font-bold mb-2">Store Info (Editable)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["name", "address", "phone", "email"].map((key) => (
            <Input
              key={key}
              placeholder={key}
              value={storeInfo[key as keyof typeof storeInfo]}
              onChange={(e) =>
                setStoreInfo({ ...storeInfo, [key]: e.target.value })
              }
            />
          ))}
        </div>
      </Card>

      <h1 className="text-3xl font-bold">Orders Management</h1>
      <Card className="p-6 shadow">
        {isLoading ? (
          <p>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p>No orders found</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <AnimatePresence key={order._id}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className={`p-4 border ${
                      updatedOrderId === order._id ? "border-blue-500" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          Rs. {order.total?.toLocaleString() || "0"} •{" "}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
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
                          className="bg-gray-200 hover:bg-gray-300"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="w-4 h-4 mr-1" /> Print
                        </Button>
                      </div>
                    </div>

                    {openOrderId === order._id && (
                      <div className="mt-6 border-t pt-6 grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold mb-1">
                              Customer Info
                            </h3>
                            <p>{order.user?.name}</p>
                            <p className="text-sm text-gray-500">
                              {order.user?.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              {order.user?.phone}
                            </p>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-1">
                              Payment Method
                            </h3>
                            <p className="capitalize">{order.paymentMethod}</p>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-1">Order Items</h3>
                            <table className="w-full border">
                              <thead>
                                <tr>
                                  <th className="border p-1">Item</th>
                                  <th className="border p-1">Qty</th>
                                  <th className="border p-1">Price</th>
                                  <th className="border p-1">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="border p-1">
                                      {item.product.name}
                                    </td>
                                    <td className="border p-1">
                                      {item.quantity}
                                    </td>
                                    <td className="border p-1">
                                      Rs. {item.price}
                                    </td>
                                    <td className="border p-1">
                                      Rs. {item.subtotal}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="mt-2">
                              <p>Subtotal: Rs. {order.subtotal}</p>
                              <p>GST: Rs. {order.gstAmount}</p>
                              <p className="font-bold">
                                Total: Rs. {order.total}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-1">
                              Tracking Info
                            </h3>
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
                              className="mb-2"
                            />
                            <Input
                              placeholder="Courier Name"
                              value={trackingInputs[order._id]?.courier || ""}
                              onChange={(e) =>
                                handleTrackingChange(
                                  order._id,
                                  "courier",
                                  e.target.value,
                                )
                              }
                            />
                            <Button
                              size="sm"
                              className="mt-2 bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleTrackingSave(order._id)}
                            >
                              Save Tracking
                            </Button>
                          </div>

                          {order.paymentStatus === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(order._id)}
                              >
                                <Check className="w-4 h-4 mr-1" /> Approve
                                Payment
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleReject(order._id)}
                              >
                                <X className="w-4 h-4 mr-1" /> Reject Payment
                              </Button>
                            </div>
                          )}

                          <div className="mt-4">
                            <label className="block mb-1 font-semibold">
                              Update Order Status
                            </label>
                            <select
                              value={order.orderStatus}
                              onChange={(e) =>
                                handleStatusUpdate(order._id, e.target.value)
                              }
                              className="border p-1 rounded"
                            >
                              {[
                                "pending",
                                "processing",
                                "shipped",
                                "delivered",
                                "cancelled",
                              ].map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Payment Proof</h3>
                          {order.paymentScreenshot ? (
                            <div className="flex flex-col gap-2">
                              <a
                                href={order.paymentScreenshot}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={order.paymentScreenshot}
                                  className="rounded-lg border max-h-80 object-contain hover:scale-105 transition-transform cursor-pointer"
                                  alt="Payment Screenshot"
                                />
                              </a>
                              <a
                                href={order.paymentScreenshot}
                                download={`payment_${order.orderNumber}`}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                Download
                              </a>
                            </div>
                          ) : (
                            <p className="text-gray-500">
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
