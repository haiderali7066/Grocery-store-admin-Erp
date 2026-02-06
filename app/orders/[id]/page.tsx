'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/store/Navbar';
import { Footer } from '@/components/store/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import {AuthProvider} from '@/components/auth/AuthProvider'; // Import AuthProvider

interface OrderDetail {
  _id: string;
  orderNumber: string;
  items: any[];
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
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data.order);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const downloadInvoice = () => {
    window.print();
  };

  const submitRefundRequest = async () => {
    if (!refundReason.trim()) {
      alert('Please provide a reason for refund');
      return;
    }

    setRefundLoading(true);
    try {
      const res = await fetch('/api/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order?._id,
          reason: refundReason,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to submit refund request');
        return;
      }

      alert('Refund request submitted successfully! We will review and respond within 24 hours.');
      setShowRefundModal(false);
      setRefundReason('');
    } catch (error) {
      console.error('[Refund] Error:', error);
      alert('Failed to submit refund request');
    } finally {
      setRefundLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-white">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center">Loading order details...</p>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    );
  }

  if (!order) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-white">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center text-red-600">Order not found</p>
            <Button asChild className="mx-auto block mt-4">
              <Link href="/orders">Back to Orders</Link>
            </Button>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Button variant="outline" asChild>
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <Card className="p-6 border-0 shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      Order {order.orderNumber}
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        order.paymentStatus === 'verified'
                          ? 'bg-green-100 text-green-800'
                          : order.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {order.paymentStatus === 'verified'
                        ? 'Payment Verified'
                        : order.paymentStatus === 'pending'
                          ? 'Awaiting Payment'
                          : 'Payment Failed'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Items */}
              <Card className="p-6 border-0 shadow-md">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Order Items
                </h2>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-3 border-b border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.product?.name || 'Product'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        Rs. {item.subtotal?.toFixed(0) || (item.price * item.quantity).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Tracking Info */}
              {order.trackingNumber && (
                <Card className="p-6 border-0 shadow-md bg-blue-50">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Tracking Information
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="font-semibold text-gray-900">
                        {order.trackingNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Provider</p>
                      <p className="font-semibold text-gray-900">
                        {order.trackingProvider}
                      </p>
                    </div>
                    {order.trackingURL && (
                      <Button
                        asChild
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Link href={order.trackingURL} target="_blank">
                          Track Package
                        </Link>
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* Shipping Address */}
              <Card className="p-6 border-0 shadow-md">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Shipping Address
                </h2>
                <div className="text-gray-700 space-y-1">
                  <p>
                    {order.shippingAddress?.street},{' '}
                    {order.shippingAddress?.city}
                  </p>
                  <p>{order.shippingAddress?.province}</p>
                  <p>{order.shippingAddress?.zipCode}</p>
                  <p>{order.shippingAddress?.country}</p>
                </div>
              </Card>
            </div>

            {/* Summary */}
            <div className="h-fit">
              <Card className="p-6 border-0 shadow-md">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-4 border-b border-gray-200 pb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">
                      Rs. {order.subtotal.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST (17%)</span>
                    <span className="font-semibold">
                      Rs. {order.gstAmount.toFixed(0)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between mb-6 text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-green-700">
                    Rs. {order.total.toFixed(0)}
                  </span>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={downloadInvoice}
                    className="w-full bg-green-700 hover:bg-green-800"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Invoice
                  </Button>
                  {!order.isPOS && order.orderStatus !== 'cancelled' && (
                    <Button
                      onClick={() => setShowRefundModal(true)}
                      variant="outline"
                      className="w-full border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Request Refund
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
        <Footer />

        {/* Refund Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Request Refund</h2>
                <p className="text-gray-600 mb-4">
                  Please tell us why you'd like to request a refund. Our team will review your request within 24 hours.
                </p>

                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter your reason for refund..."
                  className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={4}
                />

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowRefundModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitRefundRequest}
                    disabled={refundLoading || !refundReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {refundLoading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AuthProvider>
  );
}
