"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Zap, Save, Clock, Eye, Package, Search, RefreshCw, CheckCircle,
  AlertCircle, Flame, ToggleLeft, ToggleRight, Tag, X, Plus,
  Trash2, Edit2, ShoppingBag, ChevronDown, ChevronUp, Check,
  Loader2,
} from "lucide-react";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface BundleProduct {
  productId: string;
  name: string;
  quantity: number;
  mainImage?: string;
  retailPrice: number;
}

interface Bundle {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  products: { product: Product; quantity: number }[];
  bundlePrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  isActive: boolean;
  isFlashSale: boolean;
  createdAt: string;
}

type ToastType = "success" | "error" | null;
type Tab = "products" | "bundles";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  } catch { return ""; }
}

function getSalePrice(p: Product): number {
  if (!p.discount || !p.retailPrice) return p.retailPrice ?? 0;
  return p.discountType === "percentage"
    ? p.retailPrice * (1 - p.discount / 100)
    : Math.max(0, p.retailPrice - p.discount);
}

function getBundleSalePrice(b: Bundle): number {
  if (!b.discount) return b.bundlePrice;
  return b.discountType === "percentage"
    ? b.bundlePrice * (1 - b.discount / 100)
    : Math.max(0, b.bundlePrice - b.discount);
}

// ── Bundle Form Modal ─────────────────────────────────────────────────────────

function BundleFormModal({
  allProducts,
  editing,
  onClose,
  onSaved,
}: {
  allProducts: Product[];
  editing: Bundle | null;
  onClose: () => void;
  onSaved: (b: Bundle) => void;
}) {
  const [name, setName] = useState(editing?.name || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [bundlePrice, setBundlePrice] = useState(String(editing?.bundlePrice || ""));
  const [discount, setDiscount] = useState(String(editing?.discount || 0));
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(editing?.discountType || "percentage");
  const [isFlashSale, setIsFlashSale] = useState(editing?.isFlashSale ?? true);
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [selectedProducts, setSelectedProducts] = useState<BundleProduct[]>(
    editing?.products?.map(p => ({
      productId: p.product._id,
      name: p.product.name,
      quantity: p.quantity,
      mainImage: p.product.mainImage,
      retailPrice: p.product.retailPrice,
    })) || []
  );
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalOriginal = selectedProducts.reduce((s, p) => {
    const prod = allProducts.find(ap => ap._id === p.productId);
    return s + (prod?.retailPrice || 0) * p.quantity;
  }, 0);

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
    !selectedProducts.find(sp => sp.productId === p._id)
  );

  const addProduct = (p: Product) => {
    setSelectedProducts(prev => [...prev, {
      productId: p._id,
      name: p.name,
      quantity: 1,
      mainImage: p.mainImage,
      retailPrice: p.retailPrice,
    }]);
    setProductSearch("");
  };

  const removeProduct = (id: string) =>
    setSelectedProducts(prev => prev.filter(p => p.productId !== id));

  const updateQty = (id: string, qty: number) =>
    setSelectedProducts(prev => prev.map(p => p.productId === id ? { ...p, quantity: Math.max(1, qty) } : p));

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("Bundle name is required"); return; }
    if (selectedProducts.length === 0) { setError("Add at least one product"); return; }
    const price = parseFloat(bundlePrice);
    if (!price || price <= 0) { setError("Valid bundle price is required"); return; }

    setSaving(true);
    try {
      const payload = {
        name, description, bundlePrice: price,
        discount: parseFloat(discount) || 0,
        discountType, isFlashSale, isActive,
        products: selectedProducts.map(p => ({ productId: p.productId, quantity: p.quantity })),
      };

      const url = editing ? `/api/admin/sale/bundles/${editing._id}` : "/api/admin/sale/bundles";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");
      onSaved(data.bundle);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-green-600" />
            {editing ? "Edit Bundle" : "Create New Bundle"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Bundle Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Family Health Pack" className="rounded-xl" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description…" className="rounded-xl resize-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Bundle Price (Rs) *</label>
              <Input type="number" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="0" className="rounded-xl" />
              {totalOriginal > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Retail total: Rs. {totalOriginal.toLocaleString()}
                  {parseFloat(bundlePrice) > 0 && totalOriginal > parseFloat(bundlePrice) && (
                    <span className="text-green-600 font-semibold ml-1">
                      (Rs. {(totalOriginal - parseFloat(bundlePrice)).toFixed(0)} savings)
                    </span>
                  )}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Extra Discount</label>
              <div className="flex gap-2">
                <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className="rounded-xl flex-1" />
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as any)}
                  className="px-3 py-2 border rounded-xl text-sm bg-white text-gray-700 font-medium"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">Rs</option>
                </select>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsFlashSale(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${isFlashSale ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-gray-200 text-gray-400"}`}
            >
              {isFlashSale ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              <Zap className="h-3.5 w-3.5" /> Flash Sale
            </button>
            <button
              onClick={() => setIsActive(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${isActive ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 text-gray-400"}`}
            >
              {isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              Active / Visible
            </button>
          </div>

          {/* Product picker */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Products in Bundle *</label>

            {/* Selected products */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedProducts.map(sp => (
                  <div key={sp.productId} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <div className="relative w-9 h-9 shrink-0 rounded-lg overflow-hidden bg-white border">
                      <Image src={sp.mainImage || "/placeholder.svg"} alt={sp.name} fill className="object-contain p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{sp.name}</p>
                      <p className="text-xs text-gray-400">Rs. {sp.retailPrice?.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(sp.productId, sp.quantity - 1)} className="w-6 h-6 rounded-full bg-white border text-gray-600 hover:bg-gray-100 text-xs font-bold flex items-center justify-center">−</button>
                      <span className="w-7 text-center text-sm font-bold">{sp.quantity}</span>
                      <button onClick={() => updateQty(sp.productId, sp.quantity + 1)} className="w-6 h-6 rounded-full bg-white border text-gray-600 hover:bg-gray-100 text-xs font-bold flex items-center justify-center">+</button>
                    </div>
                    <button onClick={() => removeProduct(sp.productId)} className="text-red-400 hover:text-red-600 shrink-0 ml-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search to add */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search and add products…"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            {productSearch && (
              <div className="mt-2 border rounded-xl overflow-hidden shadow-lg max-h-52 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No products found</p>
                ) : (
                  filteredProducts.slice(0, 10).map(p => (
                    <button
                      key={p._id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-green-50 transition-colors border-b last:border-b-0 text-left"
                    >
                      <div className="relative w-8 h-8 shrink-0 rounded-lg overflow-hidden bg-gray-50 border">
                        <Image src={p.mainImage || "/placeholder.svg"} alt={p.name} fill className="object-contain p-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">Rs. {p.retailPrice?.toLocaleString()} · {p.stock} in stock</p>
                      </div>
                      <Plus className="h-4 w-4 text-green-600 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800 gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {editing ? "Update Bundle" : "Create Bundle"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Bundle Card ───────────────────────────────────────────────────────────────

function BundleCard({
  bundle,
  onEdit,
  onDelete,
  onToggleFlash,
  isUpdating,
}: {
  bundle: Bundle;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFlash: () => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const salePrice = getBundleSalePrice(bundle);
  const retailTotal = bundle.products.reduce(
    (sum, bp) => sum + ((bp.product?.retailPrice || 0) * bp.quantity),
    0
  );
  const savings = retailTotal - salePrice;
  const savingsPct = retailTotal > 0 ? Math.round((savings / retailTotal) * 100) : 0;

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-gray-900 truncate">{bundle.name}</h3>
              {bundle.isFlashSale && (
                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                  <Zap className="h-2.5 w-2.5 fill-yellow-700" /> Flash Sale
                </span>
              )}
              {!bundle.isActive && (
                <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full uppercase">Inactive</span>
              )}
            </div>
            {bundle.description && (
              <p className="text-xs text-gray-500 line-clamp-1">{bundle.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleFlash}
              disabled={isUpdating}
              title={bundle.isFlashSale ? "Remove from Flash Sale" : "Add to Flash Sale"}
              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${bundle.isFlashSale ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200" : "bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"}`}
            >
              {isUpdating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Price row */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-black text-green-700">Rs. {salePrice.toLocaleString()}</span>
          {savings > 0 && (
            <>
              <span className="text-sm text-gray-400 line-through">Rs. {retailTotal.toLocaleString()}</span>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {savingsPct}% OFF
              </span>
            </>
          )}
        </div>

        {/* Bundle items list */}
        <div className="space-y-2 mb-3">
          {bundle.products.map((bp, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white border flex-shrink-0">
                <Image
                  src={bp.product?.mainImage || "/placeholder.svg"}
                  alt={bp.product?.name || ""}
                  fill
                  className="object-contain p-1"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {bp.product?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {bp.product?.unitSize} {bp.product?.unitType}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">× {bp.quantity}</p>
                <p className="text-sm font-bold text-gray-800">
                  Rs. {((bp.product?.retailPrice || 0) * bp.quantity).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Expandable summary */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full justify-center py-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Hide Summary
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show Summary
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Retail Total:</span>
              <span>Rs. {retailTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Bundle Price:</span>
              <span>Rs. {bundle.bundlePrice.toLocaleString()}</span>
            </div>
            {bundle.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Extra Discount:</span>
                <span>
                  {bundle.discountType === "percentage"
                    ? `-${bundle.discount}%`
                    : `-Rs. ${bundle.discount}`}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-green-700 border-t pt-1 mt-1">
              <span>Customer Pays:</span>
              <span>Rs. {salePrice.toLocaleString()}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between font-semibold text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                <span>✓ Customer Saves:</span>
                <span>Rs. {savings.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSalePage() {
  const [config, setConfig] = useState<SaleConfig>({
    isActive: false, title: "Flash Sale",
    subtitle: "Unbeatable deals for a limited time only",
    badgeText: "Flash Sale", endsAt: "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [showBundleForm, setShowBundleForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({ type: null, message: "" });

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 3500);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoadingProducts(true);
    try {
      const [saleRes, bundleRes] = await Promise.all([
        fetch("/api/admin/sale"),
        fetch("/api/admin/sale/bundles"),
      ]);
      const saleData = await saleRes.json();
      const bundleData = await bundleRes.json();

      if (saleData.sale) {
        setConfig({
          isActive: saleData.sale.isActive ?? false,
          title: saleData.sale.title || "Flash Sale",
          subtitle: saleData.sale.subtitle || "",
          badgeText: saleData.sale.badgeText || "Flash Sale",
          endsAt: saleData.sale.endsAt || "",
        });
      }
      setProducts(saleData.products ?? []);
      setBundles(bundleData.bundles ?? []);
    } catch (e: any) {
      showToast("error", e.message || "Failed to load data");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSaveConfig = async () => {
    if (config.isActive && !config.endsAt) { showToast("error", "Please set a sale end date/time"); return; }
    if (config.isActive && config.endsAt && new Date(config.endsAt).getTime() <= Date.now()) {
      showToast("error", "Sale end time must be in the future"); return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/sale", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      if (data.sale) setConfig(prev => ({ ...prev, endsAt: data.sale.endsAt || "", isActive: data.sale.isActive ?? prev.isActive }));
      showToast("success", "Sale settings saved!");
    } catch (e: any) {
      showToast("error", e.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFlashSale = async (product: Product) => {
    const next = !product.isNewArrival;
    setUpdatingId(product._id);
    setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isNewArrival: next } : p));
    try {
      const res = await fetch("/api/admin/sale", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id, isNewArrival: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      showToast("success", next ? "Added to Flash Sale ⚡" : "Removed from Flash Sale");
    } catch (e: any) {
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isNewArrival: product.isNewArrival } : p));
      showToast("error", e.message || "Failed to update product");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleBundleFlash = async (bundle: Bundle) => {
    const next = !bundle.isFlashSale;
    setUpdatingId(bundle._id);
    setBundles(prev => prev.map(b => b._id === bundle._id ? { ...b, isFlashSale: next } : b));
    try {
      const res = await fetch(`/api/admin/sale/bundles/${bundle._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFlashSale: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast("success", next ? "Bundle added to Flash Sale ⚡" : "Bundle removed from Flash Sale");
    } catch (e: any) {
      setBundles(prev => prev.map(b => b._id === bundle._id ? { ...b, isFlashSale: bundle.isFlashSale } : b));
      showToast("error", e.message || "Failed to update bundle");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteBundle = async (id: string) => {
    if (!confirm("Delete this bundle? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/sale/bundles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).message);
      setBundles(prev => prev.filter(b => b._id !== id));
      showToast("success", "Bundle deleted");
    } catch (e: any) {
      showToast("error", e.message || "Failed to delete");
    }
  };

  const handleBundleSaved = (bundle: Bundle) => {
    if (editingBundle) {
      setBundles(prev => prev.map(b => b._id === bundle._id ? bundle : b));
      showToast("success", "Bundle updated!");
    } else {
      setBundles(prev => [bundle, ...prev]);
      showToast("success", "Bundle created!");
    }
    setShowBundleForm(false);
    setEditingBundle(null);
  };

  const flashProducts = products.filter(p => p.isNewArrival);
  const flashBundles = bundles.filter(b => b.isFlashSale);
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const timeRemaining = (() => {
    if (!config.endsAt) return null;
    const diff = new Date(config.endsAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `${d}d ${h}h remaining`;
    if (h > 0) return `${h}h ${m}m remaining`;
    return `${m}m remaining`;
  })();

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast.type && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}>
          {toast.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Bundle form modal */}
      {showBundleForm && (
        <BundleFormModal
          allProducts={products}
          editing={editingBundle}
          onClose={() => { setShowBundleForm(false); setEditingBundle(null); }}
          onSaved={handleBundleSaved}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="h-5 w-5 text-gray-900 fill-gray-900" />
            </div>
            Flash Sale Manager
          </h1>
          <p className="text-gray-500 text-sm mt-1">Configure sale settings, tag products, and manage bundles</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchAll} disabled={isLoadingProducts} size="sm" className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingProducts ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <a href="/sale" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2"><Eye className="h-3.5 w-3.5" /> Preview</Button>
          </a>
          <Button onClick={handleSaveConfig} disabled={isSaving} className="bg-green-700 hover:bg-green-800 gap-2" size="sm">
            <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="xl:col-span-1 space-y-4">
          {/* Sale status */}
          <Card className="p-5 border-0 shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-gray-900 mb-0.5">Sale Status</h2>
                <p className="text-xs text-gray-500">Enable to show the flash sale page</p>
              </div>
              <button onClick={() => setConfig(prev => ({ ...prev, isActive: !prev.isActive }))} className="shrink-0 mt-0.5">
                {config.isActive ? <ToggleRight className="h-9 w-9 text-green-600" /> : <ToggleLeft className="h-9 w-9 text-gray-300" />}
              </button>
            </div>
            <div className={`mt-3 text-sm font-semibold px-3 py-2 rounded-lg ${config.isActive ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}>
              {config.isActive ? "✓ Sale is LIVE" : "Sale is inactive"}
            </div>
          </Card>

          {/* Hero content */}
          <Card className="p-5 border-0 shadow-md space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Flame className="h-4 w-4 text-yellow-500" /> Hero Content</h2>
            {[
              { label: "Sale Title", key: "title", placeholder: "Flash Sale" },
              { label: "Subtitle", key: "subtitle", placeholder: "Unbeatable deals — limited time only" },
              { label: "Badge Text", key: "badgeText", placeholder: "Flash Sale" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
                <Input value={(config as any)[key]} onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} className="rounded-xl" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Sale Ends At
              </label>
              <Input type="datetime-local" value={toDatetimeLocal(config.endsAt)}
                onChange={e => setConfig(prev => ({ ...prev, endsAt: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                className="rounded-xl"
              />
              {config.endsAt && (
                <p className={`text-xs mt-1.5 font-semibold ${timeRemaining === "Expired" ? "text-red-500" : "text-green-600"}`}>
                  {timeRemaining === "Expired" ? "⚠ Sale has expired" : `⏱ ${timeRemaining}`}
                </p>
              )}
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-5 border-0 shadow-md">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-green-600" /> Sale Summary
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-yellow-700">{flashProducts.length}</p>
                <p className="text-xs text-yellow-600 font-semibold">Products</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-green-700">{flashBundles.length}</p>
                <p className="text-xs text-green-600 font-semibold">Bundles</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right panel with tabs */}
        <div className="xl:col-span-2">
          <Card className="border-0 shadow-md h-full overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("products")}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${activeTab === "products" ? "text-green-700 border-b-2 border-green-700 bg-green-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Package className="h-4 w-4" /> Products
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "products" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {flashProducts.length}/{products.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("bundles")}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${activeTab === "bundles" ? "text-green-700 border-b-2 border-green-700 bg-green-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                <ShoppingBag className="h-4 w-4" /> Bundles
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "bundles" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {flashBundles.length}/{bundles.length}
                </span>
              </button>
            </div>

            {/* Products tab */}
            {activeTab === "products" && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-gray-900">Tag Products</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Click to add / remove</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Products with <code className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded font-mono">⚡ Flash Sale</code> badge appear on the sale page
                </p>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
                  {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
                </div>

                {isLoadingProducts ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-44" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-gray-300">
                    <Package className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">{search ? `No products matching "${search}"` : "No products found"}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-3">{filtered.length} product{filtered.length !== 1 ? "s" : ""}{search && ` matching "${search}"`}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto pr-1">
                      {filtered.map(product => {
                        const inSale = product.isNewArrival;
                        const isUpdating = updatingId === product._id;
                        const sale = getSalePrice(product);
                        return (
                          <button key={product._id} onClick={() => toggleFlashSale(product)} disabled={isUpdating}
                            className={`relative text-left rounded-2xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.97] disabled:opacity-60 ${inSale ? "border-yellow-400 bg-yellow-50 shadow-[0_0_0_1px_rgba(250,204,21,0.3)]" : "border-gray-100 bg-white hover:border-green-200"}`}
                          >
                            {inSale && <div className="absolute top-2 right-2 z-10 bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center shadow"><Zap className="h-2.5 w-2.5 text-gray-900 fill-gray-900" /></div>}
                            {isUpdating && <div className="absolute inset-0 z-20 bg-white/70 flex items-center justify-center"><RefreshCw className="h-4 w-4 text-green-600 animate-spin" /></div>}
                            <div className="relative h-20 bg-gray-50 overflow-hidden">
                              <Image src={product.mainImage || "/placeholder.svg"} alt={product.name} fill className="object-contain p-3" />
                            </div>
                            <div className="p-3">
                              <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">{product.name}</p>
                              <p className="text-[10px] text-gray-400 mb-1">{product.unitSize} {product.unitType}</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-black text-green-700">Rs. {sale.toFixed(0)}</span>
                                {product.discount > 0 && <span className="text-[10px] text-gray-400 line-through">{product.retailPrice}</span>}
                              </div>
                              <p className={`text-[10px] mt-1 font-semibold ${product.stock <= 0 ? "text-red-400" : product.stock <= 10 ? "text-orange-400" : "text-gray-400"}`}>
                                {product.stock <= 0 ? "Out of stock" : `${product.stock} in stock`}
                              </p>
                              <div className={`mt-2 text-center text-[9px] font-black uppercase tracking-widest py-1 rounded-lg ${inSale ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-400"}`}>
                                {inSale ? "⚡ In Sale — Click to Remove" : "+ Add to Sale"}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bundles tab */}
            {activeTab === "bundles" && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-gray-900">Sale Bundles</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Create product bundles with a special bundle price</p>
                  </div>
                  <Button
                    onClick={() => { setEditingBundle(null); setShowBundleForm(true); }}
                    className="bg-green-700 hover:bg-green-800 gap-2" size="sm"
                  >
                    <Plus className="h-4 w-4" /> New Bundle
                  </Button>
                </div>

                {isLoadingProducts ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-28" />)}
                  </div>
                ) : bundles.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl">
                    <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-400 mb-1">No bundles yet</p>
                    <p className="text-xs text-gray-300 mb-4">Create your first bundle to offer special deals</p>
                    <Button onClick={() => { setEditingBundle(null); setShowBundleForm(true); }} size="sm" className="bg-green-700 hover:bg-green-800 gap-2">
                      <Plus className="h-4 w-4" /> Create First Bundle
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                    {bundles.map(bundle => (
                      <BundleCard
                        key={bundle._id}
                        bundle={bundle}
                        onEdit={() => { setEditingBundle(bundle); setShowBundleForm(true); }}
                        onDelete={() => deleteBundle(bundle._id)}
                        onToggleFlash={() => toggleBundleFlash(bundle)}
                        isUpdating={updatingId === bundle._id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}