'use client';

import React from "react"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/store/Navbar';
import { Footer } from '@/components/store/Footer';
import { useCart } from '@/components/cart/CartProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';

function CheckoutContent() {
  const { items, subtotal, gstAmount, total, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    street: '',
    city: '',
    province: '',
    zipCode: '',
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    setIsProcessing(true);
    try {
      // Create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          items,
          shippingAddress: {
            street: formData.street,
            city: formData.city,
            province: formData.province,
            zipCode: formData.zipCode,
            country: 'Pakistan',
          },
          subtotal,
          gstAmount,
          total,
          paymentMethod,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        clearCart();
        router.push(`/orders/${data.order._id}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
        <Button asChild className="bg-green-700">
          <a href="/products">Continue Shopping</a>
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Please Login to Checkout</h2>
        <Button asChild className="bg-green-700">
          <a href="/login">Login</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
            {/* Shipping Address */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <Input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <Input
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province
                    </label>
                    <Input
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <Input
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                  <TabsTrigger value="easypaisa">EasyPaisa</TabsTrigger>
                  <TabsTrigger value="jazzcash">JazzCash</TabsTrigger>
                </TabsList>

                <TabsContent value="bank" className="mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <p className="text-sm text-blue-800">
                        Please transfer the amount to the account details below and upload the receipt:
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <p className="text-sm"><strong>Account Holder:</strong> Khas Pure Food</p>
                      <p className="text-sm"><strong>Account Number:</strong> 1234567890</p>
                      <p className="text-sm"><strong>Bank:</strong> HBL</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="easypaisa" className="mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <p className="text-sm text-blue-800">
                        Send money to this EasyPaisa number:
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <p className="text-sm"><strong>Number:</strong> 03001234567</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="jazzcash" className="mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <p className="text-sm text-blue-800">
                        Send money to this JazzCash number:
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <p className="text-sm"><strong>Number:</strong> 03009876543</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Payment Proof */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Payment Proof
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-green-700 hover:bg-green-800 py-3 text-lg"
            >
              {isProcessing ? 'Processing...' : 'Complete Order'}
            </Button>
          </form>

          {/* Order Summary */}
          <div className="h-fit sticky top-20">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-2 mb-4 border-b border-gray-200 pb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} x {item.quantity}</span>
                    <span>Rs. {(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (17%)</span>
                  <span>Rs. {gstAmount.toFixed(0)}</span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-green-700 text-lg">
                  Rs. {total.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CheckoutContent />
      </main>
      <Footer />
    </div>
  );
}
