"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Download,
  RotateCcw,
  Package,
  Truck,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { AuthProvider } from "@/components/auth/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("defective");
  const [refundNotes, setRefundNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleRefundRequest = async () => {
    if (!order) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/refunds/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
          reason: `${refundReason}: ${refundNotes}`,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(
          "✅ Refund request submitted successfully!\n\n" +
            "We will review your request and respond within 24 hours.\n" +
            "Note: Rs 300 delivery charges will be deducted from your refund amount."
        );
        setShowRefundDialog(false);
        setRefundReason("defective");
        setRefundNotes("");
      } else {
        alert(`❌ ${data.error || "Failed to submit refund request"}`);
      }
    } catch (error) {
      console.error("Refund request error:", error);
      alert("❌ Error submitting refund request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if refund can be requested
  const canRequestRefund = () => {
    if (!order) return false;
    if (order.isPOS) return false; // No refunds for walk-in sales
    if (order.orderStatus === "cancelled") return false;
    
    // Allow refunds for delivered orders
    if (order.orderStatus === "delivered") return true;
    
    // Also allow for shipped orders (in transit)
    if (order.orderStatus === "shipped") return true;
    
    return false;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Package className="h-5 w-5" />;
      case "confirmed":
      case "processing":
        return <Package className="h-5 w-5" />;
      case "shipped":
        return <Truck className="h-5 w-5" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  if (isLoading)
    return (
      <AuthProvider>
        <div className="min-h-screen">
          <Navbar />
          <main className="p-6 text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p>Loading order details...</p>
          </main>
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
            </Link>
          </Button>

          {/* Order Info */}
          <Card className="p-6 border-0 shadow-md mb-6 bg-white">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Order {order.orderNumber}
                </h1>
                <p className="text-gray-600 mt-1">
                  Placed on {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                    order.orderStatus === "delivered"
                      ? "bg-green-100 text-green-800"
                      : order.orderStatus === "shipped"
                        ? "bg-blue-100 text-blue-800"
                        : order.orderStatus === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : order.orderStatus === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {getStatusIcon(order.orderStatus)}
                  {order.orderStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </Card>

          {/* Refund Button */}
          {canRequestRefund() && (
            <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-orange-900">
                    Not satisfied with your order?
                  </p>
                  <p className="text-sm text-orange-700">
                    Request a refund and we'll process it within 24 hours
                  </p>
                </div>
                <Dialog
                  open={showRefundDialog}
                  onOpenChange={setShowRefundDialog}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Request Refund
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Refund</DialogTitle>
                      <DialogDescription>
                        Please provide details about why you want to return this
                        order
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Reason for Return *
                        </label>
                        <Select
                          value={refundReason}
                          onValueChange={setRefundReason}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="defective">
                              Defective Product
                            </SelectItem>
                            <SelectItem value="wrong_item">
                              Wrong Item Received
                            </SelectItem>
                            <SelectItem value="not_as_described">
                              Not As Described
                            </SelectItem>
                            <SelectItem value="damaged">
                              Damaged During Shipping
                            </SelectItem>
                            <SelectItem value="expired">
                              Expired Product
                            </SelectItem>
                            <SelectItem value="changed_mind">
                              Changed My Mind
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Additional Details *
                        </label>
                        <Textarea
                          value={refundNotes}
                          onChange={(e) => setRefundNotes(e.target.value)}
                          placeholder="Please provide more details about your return request..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      <Card className="p-3 bg-blue-50 border-blue-200">
                        <p className="text-xs text-blue-800">
                          <strong>Refund Policy:</strong>
                        </p>
                        <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                          <li>Rs 300 delivery charges will be deducted</li>
                          <li>Refund processed within 24-48 hours</li>
                          <li>Product must be returned in original condition</li>
                        </ul>
                      </Card>

                      <div className="flex gap-3">
                        <Button
                          onClick={handleRefundRequest}
                          disabled={isSubmitting || !refundNotes.trim()}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                        >
                          {isSubmitting ? "Submitting..." : "Submit Request"}
                        </Button>
                        <Button
                          onClick={() => setShowRefundDialog(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          )}

          {/* Items */}
          <Card className="p-6 border-0 shadow-md mb-6 bg-white">
            <h2 className="text-lg font-bold mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center border-b pb-3 last:border-0"
                >
                  <div className="flex items-center space-x-4">
                    {item.product?.images?.[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-semibold">
                        {item.product?.name || "Product"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Rs. {item.subtotal}</p>
                    <p className="text-xs text-gray-500">
                      Rs. {item.price} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tracking Info */}
          {order.trackingNumber && (
            <Card className="p-6 border-0 shadow-md mb-6 bg-blue-50">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Tracking Information
              </h2>
              <div className="space-y-2">
                <p>
                  <span className="text-gray-600 font-medium">
                    Tracking Number:{" "}
                  </span>
                  <span className="font-semibold">{order.trackingNumber}</span>
                </p>
                <p>
                  <span className="text-gray-600 font-medium">Provider: </span>
                  <span className="font-semibold">
                    {order.trackingProvider}
                  </span>
                </p>
                {order.shippedDate && (
                  <p>
                    <span className="text-gray-600 font-medium">
                      Shipped On:{" "}
                    </span>
                    <span className="font-semibold">
                      {new Date(order.shippedDate).toLocaleDateString()}
                    </span>
                  </p>
                )}
                {order.deliveredDate && (
                  <p>
                    <span className="text-gray-600 font-medium">
                      Delivered On:{" "}
                    </span>
                    <span className="font-semibold">
                      {new Date(order.deliveredDate).toLocaleDateString()}
                    </span>
                  </p>
                )}
                {order.trackingURL && (
                  <Button
                    asChild
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Link href={order.trackingURL} target="_blank">
                      <Truck className="h-4 w-4 mr-2" />
                      Track Package
                    </Link>
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Shipping Address */}
          <Card className="p-6 border-0 shadow-md mb-6 bg-white">
            <h2 className="text-lg font-bold mb-4">Shipping Address</h2>
            <div className="text-gray-700">
              <p>{order.shippingAddress?.street}</p>
              <p>{order.shippingAddress?.city}</p>
              <p>{order.shippingAddress?.province}</p>
              <p>{order.shippingAddress?.zipCode}</p>
              {order.shippingAddress?.country && (
                <p>{order.shippingAddress.country}</p>
              )}
            </div>
          </Card>

          {/* Order Summary */}
          <Card className="p-6 border-0 shadow-md mb-6 bg-white">
            <h2 className="text-lg font-bold mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>Rs. {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>GST (17%)</span>
                <span>Rs. {order.gstAmount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg text-green-700">
                <span>Total</span>
                <span>Rs. {order.total.toFixed(2)}</span>
              </div>
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