"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Zap,
  Save,
  Clock,
  Eye,
  Package,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Flame,
  ToggleLeft,
  ToggleRight,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";

interface SaleConfig {
  isActive: boolean;
  title: string;
  subtitle: string;
  badgeText: string;
  endsAt: string;
}

interface Product {
  _id: string;
  name: string;
  retailPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  mainImage?: string;
  unitSize: number;
  unitType: string;
  stock: number;
  isNewArrival: boolean;
}

type ToastType = "success" | "error" | null;

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function getSalePrice(p: Product): number {
  if (!p.discount || !p.retailPrice) return p.retailPrice ?? 0;
  return p.discountType === "percentage"
    ? p.retailPrice * (1 - p.discount / 100)
    : Math.max(0, p.retailPrice - p.discount);
}

export default function AdminSalePage() {
  const [config, setConfig] = useState<SaleConfig>({
    isActive: false,
    title: "Flash Sale",
    subtitle: "Unbeatable deals for a limited time only",
    badgeText: "Flash Sale",
    endsAt: "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({
    type: null,
    message: "",
  });

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 3500);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/sale");
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.sale) {
        setConfig({
          isActive: data.sale.isActive ?? false,
          title: data.sale.title || "Flash Sale",
          subtitle: data.sale.subtitle || "",
          badgeText: data.sale.badgeText || "Flash Sale",
          endsAt: data.sale.endsAt || "",
        });
      }
      setProducts(data.products ?? []);
    } catch (e: any) {
      showToast("error", e.message || "Failed to load data");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSaveConfig = async () => {
    if (config.isActive && !config.endsAt) {
      showToast("error", "Please set a sale end date/time before activating");
      return;
    }
    if (
      config.isActive &&
      config.endsAt &&
      new Date(config.endsAt).getTime() <= Date.now()
    ) {
      showToast("error", "Sale end time must be in the future");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      if (data.sale)
        setConfig((prev) => ({
          ...prev,
          endsAt: data.sale.endsAt || "",
          isActive: data.sale.isActive ?? prev.isActive,
        }));
      showToast("success", "Sale settings saved!");
    } catch (e: any) {
      showToast("error", e.message || "Failed to save sale settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Calls PATCH /api/admin/sale — no [id]/route.ts changes needed
  const toggleFlashSale = async (product: Product) => {
    const next = !product.isNewArrival;
    setUpdatingId(product._id);
    setProducts((prev) =>
      prev.map((p) =>
        p._id === product._id ? { ...p, isNewArrival: next } : p,
      ),
    );
    try {
      const res = await fetch("/api/admin/sale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id, isNewArrival: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      showToast(
        "success",
        next ? "Added to Flash Sale ⚡" : "Removed from Flash Sale",
      );
    } catch (e: any) {
      setProducts((prev) =>
        prev.map((p) =>
          p._id === product._id
            ? { ...p, isNewArrival: product.isNewArrival }
            : p,
        ),
      );
      showToast("error", e.message || "Failed to update product");
    } finally {
      setUpdatingId(null);
    }
  };

  const flashProducts = products.filter((p) => p.isNewArrival);
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const timeRemaining = (() => {
    if (!config.endsAt) return null;
    const diff = new Date(config.endsAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const d = Math.floor(diff / 86400000),
      h = Math.floor((diff % 86400000) / 3600000),
      m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `${d}d ${h}h remaining`;
    if (h > 0) return `${h}h ${m}m remaining`;
    return `${m}m remaining`;
  })();

  return (
    <div className="space-y-6 p-6">
      {toast.type && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="h-5 w-5 text-gray-900 fill-gray-900" />
            </div>
            Flash Sale Manager
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure the sale hero and tag products to appear in the store
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={fetchAll}
            disabled={isLoadingProducts}
            size="sm"
            className="gap-2"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoadingProducts ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
          <a href="/sale" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
          </a>
          <Button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="bg-green-700 hover:bg-green-800 gap-2"
            size="sm"
          >
            <Save className="h-3.5 w-3.5" />{" "}
            {isSaving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          {/* Status */}
          <Card className="p-5 border-0 shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-gray-900 mb-0.5">Sale Status</h2>
                <p className="text-xs text-gray-500">
                  Enable to show the flash sale page and countdown
                </p>
              </div>
              <button
                onClick={() =>
                  setConfig((prev) => ({ ...prev, isActive: !prev.isActive }))
                }
                className="shrink-0 mt-0.5 focus:outline-none"
              >
                {config.isActive ? (
                  <ToggleRight className="h-9 w-9 text-green-600" />
                ) : (
                  <ToggleLeft className="h-9 w-9 text-gray-300" />
                )}
              </button>
            </div>
            <div
              className={`mt-3 text-sm font-semibold px-3 py-2 rounded-lg ${config.isActive ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}
            >
              {config.isActive ? "✓ Sale is LIVE" : "Sale is inactive"}
            </div>
          </Card>

          {/* Hero content */}
          <Card className="p-5 border-0 shadow-md space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Flame className="h-4 w-4 text-yellow-500" /> Hero Content
            </h2>
            {[
              { label: "Sale Title", key: "title", placeholder: "Flash Sale" },
              {
                label: "Subtitle",
                key: "subtitle",
                placeholder: "Unbeatable deals — limited time only",
              },
              {
                label: "Badge Text",
                key: "badgeText",
                placeholder: "Flash Sale",
              },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  {label}
                </label>
                <Input
                  value={(config as any)[key]}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                  className="rounded-xl"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Sale Ends At
              </label>
              <Input
                type="datetime-local"
                value={toDatetimeLocal(config.endsAt)}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    endsAt: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  }))
                }
                className="rounded-xl"
              />
              {config.endsAt && (
                <p
                  className={`text-xs mt-1.5 font-semibold ${timeRemaining === "Expired" ? "text-red-500" : "text-green-600"}`}
                >
                  {timeRemaining === "Expired"
                    ? "⚠ Sale has expired"
                    : `⏱ ${timeRemaining}`}
                </p>
              )}
            </div>
          </Card>

          {/* In-sale summary */}
          <Card className="p-5 border-0 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-600" /> In Flash Sale
              </h2>
              <span className="text-xs font-black bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
                {flashProducts.length} items
              </span>
            </div>
            {flashProducts.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                <Zap className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">
                  No products tagged yet.
                  <br />
                  Click products on the right to add.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {flashProducts.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2"
                  >
                    <div className="relative w-9 h-9 shrink-0 rounded-lg overflow-hidden bg-white border border-yellow-100">
                      <Image
                        src={p.mainImage || "/placeholder.svg"}
                        alt={p.name}
                        fill
                        className="object-contain p-0.5"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-green-700 font-bold">
                        Rs. {getSalePrice(p).toFixed(0)}
                        {p.discount > 0 && (
                          <span className="text-gray-400 font-normal ml-1">
                            (was {p.retailPrice})
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFlashSale(p)}
                      disabled={updatingId === p._id}
                      className="text-gray-300 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"
                      title="Remove from flash sale"
                    >
                      {updatingId === p._id ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-green-500" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Product picker */}
        <div className="xl:col-span-2">
          <Card className="p-5 border-0 shadow-md h-full">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900">Tag Products</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Click to add / remove from sale
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Products marked as{" "}
              <code className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded font-mono">
                Flash Sale
              </code>{" "}
              appear on the sale page
            </p>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isLoadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-gray-100 animate-pulse h-44"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-300">
                <Package className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">
                  {search
                    ? `No products matching "${search}"`
                    : "No products found"}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                  {search && ` matching "${search}"`}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[620px] overflow-y-auto pr-1">
                  {filtered.map((product) => {
                    const inSale = product.isNewArrival;
                    const isUpdating = updatingId === product._id;
                    const sale = getSalePrice(product);
                    return (
                      <button
                        key={product._id}
                        onClick={() => toggleFlashSale(product)}
                        disabled={isUpdating}
                        className={`relative text-left rounded-2xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.97] disabled:opacity-60 ${inSale ? "border-yellow-400 bg-yellow-50 shadow-[0_0_0_1px_rgba(250,204,21,0.3)]" : "border-gray-100 bg-white hover:border-green-200"}`}
                      >
                        {inSale && (
                          <div className="absolute top-2 right-2 z-10 bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center shadow">
                            <Zap className="h-2.5 w-2.5 text-gray-900 fill-gray-900" />
                          </div>
                        )}
                        {isUpdating && (
                          <div className="absolute inset-0 z-20 bg-white/70 flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 text-green-600 animate-spin" />
                          </div>
                        )}
                        <div className="relative h-20 bg-gray-50 overflow-hidden">
                          <Image
                            src={product.mainImage || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-contain p-3"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-gray-400 mb-1">
                            {product.unitSize} {product.unitType}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-green-700">
                              Rs. {sale.toFixed(0)}
                            </span>
                            {product.discount > 0 && (
                              <span className="text-[10px] text-gray-400 line-through">
                                {product.retailPrice}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[10px] mt-1 font-semibold ${product.stock <= 0 ? "text-red-400" : product.stock <= 10 ? "text-orange-400" : "text-gray-400"}`}
                          >
                            {product.stock <= 0
                              ? "Out of stock"
                              : `${product.stock} in stock`}
                          </p>
                          <div
                            className={`mt-2 text-center text-[9px] font-black uppercase tracking-widest py-1 rounded-lg ${inSale ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-400"}`}
                          >
                            {inSale
                              ? "⚡ In Sale — Click to Remove"
                              : "+ Add to Sale"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
