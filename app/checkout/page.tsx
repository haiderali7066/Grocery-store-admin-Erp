"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";

export default function CheckoutPage() {
  const { items, subtotal, gstAmount, total, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    street: "",
    city: "",
    province: "",
    zipCode: "",
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setScreenshotFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return router.push("/login");
    if (!screenshotFile) {
      alert("Please upload payment screenshot.");
      return;
    }

    setIsProcessing(true);

    try {
      // =========================
      // Upload screenshot to Cloudinary
      // =========================
      const formDataCloud = new FormData();
      formDataCloud.append("file", screenshotFile);
      formDataCloud.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET! // ✅ use env
      );

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
        { method: "POST", body: formDataCloud }
      );

      const cloudData = await cloudRes.json();
      console.log("Cloudinary response:", cloudData);

      if (!cloudData.secure_url) {
        throw new Error(
          cloudData.error?.message || "Cloudinary upload failed"
        );
      }

      const screenshotUrl = cloudData.secure_url;

      // =========================
      // Send order to backend
      // =========================
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          items,
          shippingAddress: formData,
          subtotal,
          gstAmount,
          total,
          paymentMethod,
          screenshot: screenshotUrl,
        }),
      });

      if (!orderRes.ok) throw new Error("Order creation failed");

      const data = await orderRes.json();
      clearCart();
      router.push(`/orders/${data.order._id}`);
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message || "Checkout failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user)
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Please Login to Checkout</h2>
        <Button asChild className="bg-green-700">
          <a href="/login">Login</a>
        </Button>
      </div>
    );

  if (items.length === 0)
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
        <Button asChild className="bg-green-700">
          <a href="/products">Continue Shopping</a>
        </Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
            {/* Shipping Address */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <div className="space-y-4">
                {[
                  "fullName",
                  "email",
                  "phone",
                  "street",
                  "city",
                  "province",
                  "zipCode",
                ].map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key}
                    </label>
                    <Input
                      name={key}
                      type={key === "email" ? "email" : "text"}
                      value={formData[key as keyof typeof formData]}
                      onChange={handleChange}
                      required
                    />
                  </div>
                ))}
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
                {["bank", "easypaisa", "jazzcash"].map((method) => (
                  <TabsContent key={method} value={method} className="mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex gap-2 mb-3">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <p className="text-sm text-blue-800">
                          {method === "bank" &&
                            "Please transfer the amount to the bank account and upload receipt."}
                          {method === "easypaisa" &&
                            "Send money to this EasyPaisa number: 03001234567"}
                          {method === "jazzcash" &&
                            "Send money to this JazzCash number: 03009876543"}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                ))}
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
              {isProcessing ? "Processing..." : "Complete Order"}
            </Button>
          </form>

          {/* Order Summary */}
          <div className="h-fit sticky top-20">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4 border-b border-gray-200 pb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.quantity}
                    </span>
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
      </main>
      <Footer />
    </div>
  );
}
