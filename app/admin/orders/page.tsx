"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

interface Order {
  _id: string;
  orderNumber: string;
  total?: number;
  paymentStatus?: string;
  orderStatus?: string;
  createdAt?: string;
  screenshot?: string;
  trackingCode?: string;
  courierName?: string;
  user?: { name: string; email: string; phone: string };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState<{
    [key: string]: { code: string; courier: string };
  }>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    const code = trackingInputs[orderId]?.code || `TRK-${Date.now()}`;
    const courier = trackingInputs[orderId]?.courier || "Local Courier";

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "verified",
          trackingCode: code,
          courierName: courier,
        }),
      });
      if (!res.ok) throw new Error("Failed to approve order");
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "failed" }),
      });
      if (!res.ok) throw new Error("Failed to reject order");
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600">Manage customer orders and payments</p>
      </div>

      <Card className="p-6 border-0 shadow-md overflow-x-auto">
        {isLoading ? (
          <p>Loading orders...</p>
        ) : orders.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th>Order ID</th>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Screenshot</th>
                <th>Status</th>
                <th>Tracking</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order._id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-3">{order.orderNumber}</td>
                  <td className="py-2 px-3">
                    {order.user?.name} ({order.user?.phone})
                  </td>
                  <td className="py-2 px-3">
                    Rs. {order.total?.toLocaleString()}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        order.paymentStatus === "verified"
                          ? "bg-green-100 text-green-800"
                          : order.paymentStatus === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {order.screenshot ? (
                      <img
                        src={order.screenshot}
                        alt="Payment"
                        className="h-16 w-16 object-cover rounded border"
                      />
                    ) : (
                      <span>No screenshot</span>
                    )}
                  </td>
                  <td className="py-2 px-3">{order.orderStatus}</td>
                  <td className="py-2 px-3">
                    {order.trackingCode && <p>Code: {order.trackingCode}</p>}
                    {order.courierName && <p>Courier: {order.courierName}</p>}
                    {order.paymentStatus === "pending" && (
                      <div className="flex flex-col gap-1 mt-1">
                        <Input
                          placeholder="Tracking Code"
                          value={trackingInputs[order._id]?.code || ""}
                          onChange={(e) =>
                            handleTrackingChange(
                              order._id,
                              "code",
                              e.target.value,
                            )
                          }
                          className="text-sm"
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
                          className="text-sm"
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="py-2 px-3 flex gap-2">
                    {order.paymentStatus === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(order._id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReject(order._id)}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-500 py-8">No orders found</p>
        )}
      </Card>
    </div>
  );
}
