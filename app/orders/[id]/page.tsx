"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { AuthProvider } from "@/components/auth/AuthProvider";

interface OrderItem {
  product: {
    name: string;
    images?: string[];
  } | null;
  quantity: number;
  price: number;
  subtotal: number;
}

interface OrderDetail {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  shippingAddress: any;
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  isPOS: boolean;
  createdAt: string;
  trackingNumber?: string;
  trackingProvider?: string;
  trackingURL?: string;
  shippedDate?: string;
  deliveredDate?: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error("Failed to fetch order");
        const data = await res.json();
        setOrder(data.order);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    if (orderId) fetchOrder();
  }, [orderId]);

  const downloadInvoice = () => window.print();

  if (isLoading)
    return (
      <AuthProvider>
        <div className="min-h-screen">
          <Navbar />
          <main className="p-6 text-center">Loading order details...</main>
          <Footer />
        </div>
      </AuthProvider>
    );

  if (!order)
    return (
      <AuthProvider>
        <div className="min-h-screen">
          <Navbar />
          <main className="p-6 text-center text-red-600">Order not found</main>
          <Footer />
        </div>
      </AuthProvider>
    );

  return (
    <AuthProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
            </Link>
          </Button>

          {/* Order Info */}
          <Card className="p-6 border-0 shadow-md mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">
                  Order {order.orderNumber}
                </h1>
                <p className="text-gray-600 mt-1">
                  Placed on {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  order.orderStatus === "delivered"
                    ? "bg-green-100 text-green-800"
                    : order.orderStatus === "shipped"
                      ? "bg-blue-100 text-blue-800"
                      : order.orderStatus === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                }`}
              >
                {order.orderStatus.toUpperCase()}
              </span>
            </div>
          </Card>

          {/* Items */}
          <Card className="p-6 border-0 shadow-md mb-6">
            <h2 className="text-lg font-bold mb-4">Items</h2>
            {order.items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center border-b py-3"
              >
                <div className="flex items-center space-x-4">
                  {item.product?.images?.[0] && (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <span>{item.product?.name || "Product"}</span>
                </div>
                <span>
                  {item.quantity} x Rs. {item.price} = Rs. {item.subtotal}
                </span>
              </div>
            ))}
          </Card>

          {/* Tracking Info */}
          {order.trackingNumber && (
            <Card className="p-6 border-0 shadow-md mb-6 bg-blue-50">
              <h2 className="text-lg font-bold mb-4">Tracking Info</h2>
              <p>
                <span className="text-gray-600">Number: </span>
                {order.trackingNumber}
              </p>
              <p>
                <span className="text-gray-600">Provider: </span>
                {order.trackingProvider}
              </p>
              {order.trackingURL && (
                <Button
                  asChild
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Link href={order.trackingURL} target="_blank">
                    Track Package
                  </Link>
                </Button>
              )}
            </Card>
          )}

          {/* Shipping Address */}
          <Card className="p-6 border-0 shadow-md mb-6">
            <h2 className="text-lg font-bold mb-4">Shipping Address</h2>
            <p>
              {order.shippingAddress?.street}, {order.shippingAddress?.city}
            </p>
            <p>{order.shippingAddress?.province}</p>
            <p>{order.shippingAddress?.zipCode}</p>
            {order.shippingAddress?.country && (
              <p>{order.shippingAddress.country}</p>
            )}
          </Card>

          {/* Order Summary */}
          <Card className="p-6 border-0 shadow-md mb-6">
            <h2 className="text-lg font-bold mb-4">Summary</h2>
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>Rs. {order.subtotal}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>GST</span>
              <span>Rs. {order.gstAmount}</span>
            </div>
            <div className="flex justify-between font-bold text-green-700 text-lg">
              <span>Total</span>
              <span>Rs. {order.total}</span>
            </div>
            <Button
              onClick={downloadInvoice}
              className="mt-4 w-full bg-green-700 hover:bg-green-800"
            >
              <Download className="h-4 w-4 mr-2" /> Download Invoice
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
