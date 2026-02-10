"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import Link from "next/link";
import { AuthProvider } from "@/components/auth/AuthProvider";

interface Order {
  _id: string;
  orderNumber: string;
  total?: number | null;
  paymentStatus?: string | null;
  orderStatus?: string | null;
  createdAt?: string | null;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/orders");
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
        } else {
          console.error("Failed to fetch orders:", response.statusText);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

          {isLoading ? (
            <p className="text-center text-gray-600">Loading orders...</p>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const total = order.total ?? 0;
                const paymentStatus = order.paymentStatus ?? "pending";
                const orderStatus = order.orderStatus ?? "pending";
                const createdAt = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString()
                  : "N/A";

                return (
                  <Card
                    key={order._id}
                    className="p-6 border-0 shadow-md hover:shadow-lg transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {order.orderNumber ?? "N/A"}
                        </h3>

                        <div className="flex gap-6 mt-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Amount:</span> Rs.{" "}
                            {total.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Date:</span>{" "}
                            {createdAt}
                          </p>
                        </div>

                        <div className="flex gap-3 mt-3">
                          <span
                            className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                              paymentStatus === "verified"
                                ? "bg-green-100 text-green-800"
                                : paymentStatus === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {paymentStatus === "verified"
                              ? "Payment Verified"
                              : paymentStatus === "pending"
                                ? "Awaiting Payment"
                                : "Payment Failed"}
                          </span>

                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold">
                            {orderStatus}
                          </span>
                        </div>
                      </div>

                      <Button asChild variant="outline">
                        <Link href={`/orders/${order._id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 border-0 shadow-md text-center">
              <p className="text-gray-600 mb-6">
                You haven't placed any orders yet.
              </p>
              <Button asChild className="bg-green-700 hover:bg-green-800">
                <Link href="/products">Start Shopping</Link>
              </Button>
            </Card>
          )}
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
