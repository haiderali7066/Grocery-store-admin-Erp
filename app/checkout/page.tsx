"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle, Truck, CreditCard, ShieldCheck, UploadCloud,
  ChevronRight, PackageCheck, Building2, Smartphone, Banknote,
  Loader2, Info, Package, RefreshCw,
} from "lucide-react";

interface PaymentMethodConfig {
  enabled: boolean;
  displayName: string;
  description?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  iban?: string;
  codDeliveryCharge?: number;
  codEasypaisaAccount?: string;
  codEasypaisaName?: string;
}

interface StoreSettings {
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
  shippingCost: number;
  freeShippingThreshold: number;
  paymentMethods: {
    cod: PaymentMethodConfig;
    bank: PaymentMethodConfig;
    easypaisa: PaymentMethodConfig;
    jazzcash: PaymentMethodConfig;
  };
}

type PaymentKey = "cod" | "bank" | "easypaisa" | "jazzcash";

const PAYMENT_ICONS: Record<PaymentKey, React.ReactNode> = {
  cod: <Banknote className="h-4 w-4" />,
  bank: <Building2 className="h-4 w-4" />,
  easypaisa: <Smartphone className="h-4 w-4" />,
  jazzcash: <Smartphone className="h-4 w-4" />,
};

// ── Check if a cart item is a properly-formed bundle ──────────────────────────
function isBundleValid(item: any): boolean {
  return (
    item.isBundle === true &&
    Array.isArray(item.bundleProducts) &&
    item.bundleProducts.length > 0 &&
    item.bundleProducts.every(
      (bp: any) => bp.productId && bp.productId.trim() !== "",
    )
  );
}

function isBundleBroken(item: any): boolean {
  return (
    item.isBundle === true &&
    (!Array.isArray(item.bundleProducts) || item.bundleProducts.length === 0)
  );
}

export default function CheckoutPage() {
  const {
    items,
    removeItem,
    subtotal,
    taxAmount,
    taxRate,
    taxName,
    taxEnabled,
    shippingCost,
    total,
    clearCart,
  } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentKey>("cod");
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [codScreenshotFile, setCodScreenshotFile] = useState<File | null>(null);
  const [codPreviewUrl, setCodPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Detect broken bundles in cart (stale localStorage data) ──────────────
  const brokenBundles = items.filter(isBundleBroken);
  const hasBrokenBundles = brokenBundles.length > 0;

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const s: StoreSettings = data.settings;
        setSettings(s);
        const order: PaymentKey[] = ["cod", "bank", "easypaisa", "jazzcash"];
        const first = order.find((k) => s?.paymentMethods?.[k]?.enabled);
        if (first) setPaymentMethod(first);
      })
      .catch((err) => {
        console.error("Settings error:", err);
        setError("Failed to load payment methods");
      })
      .finally(() => setIsLoadingSettings(false));
  }, []);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setScreenshotFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCodFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setCodScreenshotFile(file);
      setCodPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!,
    );
    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
      { method: "POST", body: fd },
    );
    const cloudData = await cloudRes.json();
    if (!cloudData.secure_url) throw new Error("Image upload failed");
    return cloudData.secure_url;
  };

  const codConfig = settings?.paymentMethods?.cod;
  const codDeliveryCharge = codConfig?.codDeliveryCharge || 0;
  const isCOD = paymentMethod === "cod";
  const hasCodAdvanceCharge = isCOD && codDeliveryCharge > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Please log in to continue");
      return router.push("/login");
    }

    if (items.length === 0) {
      setError("Your cart is empty");
      return;
    }

    // ── Pre-flight: block checkout if any bundle is broken ────────────────
    if (hasBrokenBundles) {
      setError(
        `The following bundle${brokenBundles.length > 1 ? "s are" : " is"} missing product details: ` +
        brokenBundles.map((b) => `"${b.name}"`).join(", ") +
        ". Please remove and re-add them to your cart.",
      );
      return;
    }

    // ── Form validation ───────────────────────────────────────────────────
    if (!formData.fullName.trim()) { setError("Full name is required"); return; }
    if (!formData.email.trim()) { setError("Email is required"); return; }
    if (!formData.phone.trim()) { setError("Phone number is required"); return; }
    if (!formData.street.trim() || !formData.city.trim()) {
      setError("Complete shipping address is required");
      return;
    }

    if (paymentMethod !== "cod" && !screenshotFile) {
      setError(
        "Please upload a payment screenshot before placing your order.",
      );
      return;
    }

    if (isCOD && codDeliveryCharge > 0 && !codScreenshotFile) {
      setError(
        `Please upload your EasyPaisa screenshot for the Rs. ${codDeliveryCharge} delivery charge advance.`,
      );
      return;
    }

    setIsProcessing(true);
    try {
      let screenshotUrl: string | null = null;
      let codDeliveryScreenshotUrl: string | null = null;

      if (paymentMethod !== "cod" && screenshotFile) {
        screenshotUrl = await uploadToCloudinary(screenshotFile);
      }
      if (isCOD && codDeliveryCharge > 0 && codScreenshotFile) {
        codDeliveryScreenshotUrl = await uploadToCloudinary(codScreenshotFile);
      }

      // ── Build order items ─────────────────────────────────────────────
      // Bundles: send isBundle=true + bundleProducts (with productId strings)
      // Regular: send product: item.id
      const orderItems = items.map((item) => {
        if (item.isBundle) {
          return {
            id: item.id,
            bundleId: item.bundleId || item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image || null,
            isBundle: true,
            // ✅ bundleProducts carries real MongoDB ObjectId strings
            bundleProducts: (item.bundleProducts || []).map((bp) => ({
              productId: bp.productId,   // real _id from CartProvider
              name: bp.name,
              quantity: bp.quantity,
              price: bp.price,           // retailPrice per unit
              image: bp.image || null,
            })),
            discount: item.discount || 0,
            gst: 0,
          };
        }
        // Regular product
        return {
          product: item.id,
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image || null,
          weight: item.weight || null,
          discount: item.discount || 0,
          gst: item.gst || 0,
        };
      });

      const orderPayload = {
        userId: user.id,
        items: orderItems,
        shippingAddress: {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          street: formData.street.trim(),
          city: formData.city.trim(),
          province: formData.province.trim(),
          zipCode: formData.zipCode.trim(),
          country: "Pakistan",
        },
        subtotal,
        gstAmount: taxAmount,
        taxRate,
        taxName,
        taxEnabled,
        shippingCost,
        total,
        paymentMethod,
        screenshot: screenshotUrl || null,
        codDeliveryCharge: isCOD ? codDeliveryCharge : 0,
        codDeliveryScreenshot: codDeliveryScreenshotUrl || null,
      };

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(
          data.message || `Order creation failed (${orderRes.status})`,
        );
      }

      clearCart();
      router.push(`/orders/${data.order._id}`);
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Checkout failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user || items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-gray-100">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <PackageCheck className="h-10 w-10 text-green-700" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {!user ? "Login Required" : "Cart is Empty"}
          </h2>
          <p className="text-gray-500 mb-8">
            {!user
              ? "Please sign in to complete your purchase."
              : "Looks like you haven't added anything yet."}
          </p>
          <Button
            asChild
            className="w-full bg-green-700 hover:bg-green-800 h-12 rounded-xl text-lg font-bold"
          >
            <a href={!user ? "/login" : "/products"}>
              {!user ? "Login" : "Start Shopping"}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const enabledMethods = (
    ["cod", "bank", "easypaisa", "jazzcash"] as PaymentKey[]
  ).filter((k) => settings?.paymentMethods?.[k]?.enabled);

  const activePayment = settings?.paymentMethods?.[paymentMethod];

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Checkout
            </h1>
            <p className="text-gray-500 font-medium">
              Securely complete your purchase
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm font-bold text-gray-400">
            <span className="text-green-700">Basket</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full">
              Details
            </span>
            <ChevronRight className="h-4 w-4" />
            <span>Success</span>
          </div>
        </div>

        {/* ── Broken bundle warning banner ── */}
        {hasBrokenBundles && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  Bundle{brokenBundles.length > 1 ? "s" : ""} need to be refreshed
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  The following bundle
                  {brokenBundles.length > 1 ? "s are" : " is"} missing product
                  details (likely saved from a previous session). Remove and re-add
                  {brokenBundles.length > 1 ? " them" : " it"} to continue.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {brokenBundles.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-white border border-amber-200 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold text-sm text-gray-800">
                      {b.name}
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                      Missing product data
                    </span>
                  </div>
                  <button
                    onClick={() => removeItem(b.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3" />
              After removing, go back to the sale page and add the bundle again.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-8">

            {/* 1. Shipping */}
            <section className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-amber-100 p-3 rounded-2xl">
                  <Truck className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Shipping Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    Full Name
                  </label>
                  <Input
                    name="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    Email Address
                  </label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    Phone Number
                  </label>
                  <Input
                    name="phone"
                    placeholder="03xx xxxxxxx"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    Street Address
                  </label>
                  <Input
                    name="street"
                    placeholder="House #, Block, Area"
                    value={formData.street}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                  {[
                    { name: "city", label: "City", placeholder: "Lahore" },
                    { name: "province", label: "Province", placeholder: "Punjab" },
                    { name: "zipCode", label: "Zip", placeholder: "54000" },
                  ].map(({ name, label, placeholder }) => (
                    <div key={name} className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">
                        {label}
                      </label>
                      <Input
                        name={name}
                        placeholder={placeholder}
                        value={(formData as any)[name]}
                        onChange={handleChange}
                        required
                        className="h-12 rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 2. Payment */}
            <section className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Payment Method
                </h2>
              </div>

              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-10 text-gray-400 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading payment options…</span>
                </div>
              ) : enabledMethods.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    No payment methods are currently available.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="grid gap-2 mb-8"
                    style={{
                      gridTemplateColumns: `repeat(${enabledMethods.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {enabledMethods.map((key) => {
                      const cfg = settings!.paymentMethods[key];
                      const isActive = paymentMethod === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(key);
                            setScreenshotFile(null);
                            setPreviewUrl(null);
                            setCodScreenshotFile(null);
                            setCodPreviewUrl(null);
                          }}
                          className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                            isActive
                              ? "border-green-600 bg-green-50 text-green-800"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {PAYMENT_ICONS[key]}
                          <span className="hidden sm:inline">
                            {cfg.displayName || key.toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isCOD ? (
                    <div className="space-y-5">
                      <div className="bg-green-50/50 border border-green-200 rounded-2xl p-6">
                        <div className="flex gap-4">
                          <Banknote className="h-8 w-8 text-green-600 shrink-0 mt-1" />
                          <div>
                            <p className="font-bold text-green-900 mb-2 text-lg">
                              {activePayment?.displayName || "Cash on Delivery"}
                            </p>
                            <p className="text-sm text-green-700 leading-relaxed mb-3">
                              {activePayment?.description ||
                                "Pay the product amount in cash when your order is delivered."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                            How Your Payment Works
                          </p>
                        </div>
                        <div className="divide-y divide-gray-100">
                          <div className="flex items-start gap-4 px-5 py-4">
                            <div className="bg-orange-100 text-orange-700 rounded-full w-7 h-7 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                              1
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-800">
                                Pay Delivery Charge Now (Advance)
                              </p>
                              {codDeliveryCharge > 0 ? (
                                <p className="text-sm text-gray-500 mt-0.5">
                                  Send{" "}
                                  <span className="font-bold text-orange-600">
                                    Rs. {codDeliveryCharge}
                                  </span>{" "}
                                  via EasyPaisa to{" "}
                                  <span className="font-semibold">
                                    {codConfig?.codEasypaisaName || "our account"}
                                  </span>{" "}
                                  {codConfig?.codEasypaisaAccount && (
                                    <span className="font-mono bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-orange-700 text-xs">
                                      {codConfig.codEasypaisaAccount}
                                    </span>
                                  )}
                                  , then upload the screenshot below.
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400 mt-0.5">
                                  No advance delivery charge required.
                                </p>
                              )}
                            </div>
                            {codDeliveryCharge > 0 && (
                              <div className="text-right shrink-0">
                                <p className="font-black text-orange-600">
                                  Rs. {codDeliveryCharge}
                                </p>
                                <p className="text-xs text-gray-400">
                                  via EasyPaisa
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-start gap-4 px-5 py-4">
                            <div className="bg-green-100 text-green-700 rounded-full w-7 h-7 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                              2
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-800">
                                Pay Remaining Amount on Delivery
                              </p>
                              <p className="text-sm text-gray-500 mt-0.5">
                                Pay the rider{" "}
                                <span className="font-bold text-green-700">
                                  Rs.{" "}
                                  {Math.max(0, total - codDeliveryCharge).toFixed(0)}
                                </span>{" "}
                                in cash when your order arrives.
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-green-700">
                                Rs.{" "}
                                {Math.max(0, total - codDeliveryCharge).toFixed(0)}
                              </p>
                              <p className="text-xs text-gray-400">
                                cash on delivery
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {codDeliveryCharge > 0 && (
                        <div>
                          <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-3">
                            EasyPaisa Screenshot (Delivery Charge){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          {codConfig?.codEasypaisaAccount && (
                            <div className="mb-3 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                              <Smartphone className="h-5 w-5 text-orange-500 shrink-0" />
                              <div className="text-sm">
                                <span className="font-semibold text-orange-800">
                                  Send Rs. {codDeliveryCharge} to:{" "}
                                </span>
                                <span className="font-mono font-bold text-orange-700 select-all">
                                  {codConfig.codEasypaisaAccount}
                                </span>
                                {codConfig.codEasypaisaName && (
                                  <span className="text-orange-600 ml-1">
                                    ({codConfig.codEasypaisaName})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          <label
                            htmlFor="cod-screenshot-upload"
                            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-8 transition-all bg-gray-50 hover:bg-gray-100 cursor-pointer ${
                              codPreviewUrl
                                ? "border-orange-300"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              id="cod-screenshot-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleCodFileChange}
                              className="sr-only"
                            />
                            {codPreviewUrl ? (
                              <div className="flex flex-col items-center">
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden mb-4 border-2 border-white shadow-md">
                                  <Image
                                    src={codPreviewUrl}
                                    alt="COD delivery charge screenshot"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <span className="text-sm font-bold text-orange-600">
                                  ✓ Screenshot uploaded — click to change
                                </span>
                              </div>
                            ) : (
                              <>
                                <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                                <p className="text-gray-500 font-medium">
                                  Upload EasyPaisa payment screenshot
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  PNG, JPG (Max 5 MB)
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      )}

                      {codDeliveryCharge === 0 && (
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700">
                            No advance delivery charge is required for this order.
                            Simply pay the full amount to the rider on delivery.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                        <div className="flex gap-4">
                          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                          <div className="space-y-1.5 text-sm">
                            <p className="font-bold text-blue-900 text-base">
                              {activePayment?.displayName ||
                                paymentMethod.toUpperCase()}{" "}
                              — Payment Details
                            </p>
                            {activePayment?.bankName && (
                              <p className="text-blue-700">
                                <span className="font-semibold">Bank:</span>{" "}
                                {activePayment.bankName}
                              </p>
                            )}
                            {activePayment?.accountName && (
                              <p className="text-blue-700">
                                <span className="font-semibold">
                                  Account Name:
                                </span>{" "}
                                {activePayment.accountName}
                              </p>
                            )}
                            {activePayment?.accountNumber && (
                              <p className="text-blue-700">
                                <span className="font-semibold">
                                  Account Number:
                                </span>{" "}
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 select-all">
                                  {activePayment.accountNumber}
                                </span>
                              </p>
                            )}
                            {activePayment?.iban && (
                              <p className="text-blue-700">
                                <span className="font-semibold">IBAN:</span>{" "}
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 select-all">
                                  {activePayment.iban}
                                </span>
                              </p>
                            )}
                            <p className="text-blue-600 pt-1">
                              Transfer the exact amount and upload your screenshot
                              below.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-4">
                          Payment Proof (Screenshot){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <label
                          htmlFor="screenshot-upload"
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-8 transition-all bg-gray-50 hover:bg-gray-100 cursor-pointer ${
                            previewUrl
                              ? "border-green-300"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            id="screenshot-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                          {previewUrl ? (
                            <div className="flex flex-col items-center">
                              <div className="relative w-32 h-32 rounded-xl overflow-hidden mb-4 border-2 border-white shadow-md">
                                <Image
                                  src={previewUrl}
                                  alt="Preview"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <span className="text-sm font-bold text-green-700">
                                ✓ Screenshot uploaded — click to change
                              </span>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                              <p className="text-gray-500 font-medium">
                                Click or drag screenshot here
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                PNG, JPG (Max 5 MB)
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <Button
              type="submit"
              disabled={
                isProcessing ||
                isLoadingSettings ||
                enabledMethods.length === 0 ||
                hasBrokenBundles
              }
              className="w-full h-16 bg-green-700 hover:bg-green-800 rounded-2xl text-xl font-black shadow-xl shadow-green-100 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {isCOD ? "Placing Order…" : "Validating Payment…"}
                </span>
              ) : hasBrokenBundles ? (
                "Fix bundle issues above to continue"
              ) : isCOD ? (
                hasCodAdvanceCharge
                  ? `Place Order — Rs. ${codDeliveryCharge} advance + rest on delivery`
                  : "Place Order — Pay on Delivery"
              ) : (
                "Place Secure Order"
              )}
            </Button>
          </form>

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6">
                  Order Summary
                </h2>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="relative h-16 w-16 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800 line-clamp-1">
                          {item.name}
                          {item.isBundle && (
                            <span
                              className={`ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                                isBundleBroken(item)
                                  ? "bg-red-100 text-red-600"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {isBundleBroken(item) ? "⚠ Needs refresh" : "Bundle"}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 font-medium">
                          {item.quantity} × Rs. {item.price.toFixed(0)}
                          {item.weight && ` • ${item.weight}`}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          Rs. {(item.price * item.quantity).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-6 border-t border-gray-100">
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toFixed(0)}</span>
                  </div>
                  {taxEnabled && (
                    <div className="flex justify-between text-gray-500 font-medium">
                      <span>
                        {taxName} ({taxRate}%)
                      </span>
                      <span>Rs. {taxAmount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Truck className="h-4 w-4" /> Shipping
                    </span>
                    {shippingCost === 0 ? (
                      <span className="text-green-600 font-bold">Free</span>
                    ) : (
                      <span>Rs. {shippingCost.toFixed(0)}</span>
                    )}
                  </div>
                  <div className="flex justify-between pt-4 border-t border-gray-100">
                    <span className="text-lg font-black text-gray-900">Total</span>
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-700 leading-none">
                        Rs. {total.toFixed(0)}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase font-black mt-1">
                        PKR
                      </p>
                    </div>
                  </div>
                  {isCOD && hasCodAdvanceCharge && (
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        Payment Breakdown
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-600 font-semibold flex items-center gap-1">
                          <Smartphone className="h-3.5 w-3.5" />
                          Advance (EasyPaisa)
                        </span>
                        <span className="font-bold text-orange-600">
                          Rs. {codDeliveryCharge}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700 font-semibold flex items-center gap-1">
                          <Banknote className="h-3.5 w-3.5" />
                          Cash on Delivery
                        </span>
                        <span className="font-bold text-green-700">
                          Rs.{" "}
                          {Math.max(0, total - codDeliveryCharge).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 rounded-2xl p-6 border border-green-100 flex items-center gap-4">
                <ShieldCheck className="h-8 w-8 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-900">
                    {isCOD ? "100% Secure Delivery" : "Secure Checkout"}
                  </p>
                  <p className="text-xs text-green-700">
                    {isCOD
                      ? hasCodAdvanceCharge
                        ? "Small advance secures your order — rest paid on delivery"
                        : "Pay only after receiving your order"
                      : "Your data is encrypted and protected"}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}