// FILE PATH: app/admin/pos/page.tsx (UPDATED VERSION)
// ═════════════════════════════════════════════════════════════════════════════
// SIMPLIFIED: Auto-fill total amount, Cash/Card payment only

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Printer,
  Trash2,
  Search,
  DollarSign,
  CheckCircle,
  ShoppingCart,
  Package,
  Minus,
  Plus,
  X,
  Barcode,
  User,
  TrendingUp,
  Settings,
  Percent,
  Tag,
  UserSearch,
  Layers,
} from "lucide-react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FIFOBatch {
  _id: string;
  remainingQuantity: number;
  sellingPrice: number;
  buyingRate: number;
}

interface POSProduct {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  costPrice?: number;
  unitSize: number;
  unitType: string;
  stock: number;
  mainImage?: string;
  gst?: number;
  lastBuyingRate?: number;
  fifoBatches: FIFOBatch[];
}

interface CartItem {
  cartKey: string;
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

interface CustomerSuggestion {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

// ─── FIFO helpers ─────────────────────────────────────────────────────────────

function getPriceForUnit(
  product: POSProduct,
  unitIndex: number
): { price: number; costPrice: number } {
  let skip = unitIndex;
  for (const batch of product.fifoBatches) {
    if (skip < batch.remainingQuantity) {
      return { price: batch.sellingPrice, costPrice: batch.buyingRate };
    }
    skip -= batch.remainingQuantity;
  }
  const last = product.fifoBatches[product.fifoBatches.length - 1];
  return {
    price: last?.sellingPrice ?? product.retailPrice,
    costPrice: last?.buyingRate ?? product.costPrice ?? product.lastBuyingRate ?? 0,
  };
}

function getNextUnitPrice(
  product: POSProduct,
  currentCartQty: number
): { price: number; costPrice: number } {
  return getPriceForUnit(product, currentCartQty);
}

// ─── Pure computation ─────────────────────────────────────────────────────────

function computeItem(
  item: Omit<CartItem, "taxAmount" | "total">
): CartItem {
  const base = item.price * item.quantity;
  const taxAmount = base * (item.taxRate / 100);
  return { ...item, taxAmount, total: base + taxAmount };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function POSPage() {
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  const [globalTaxRate, setGlobalTaxRate] = useState<number>(17);
  const [showSettings, setShowSettings] = useState(false);
  const [billDiscountType, setBillDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);

  // Keyboard nav
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);
  const [activeSection, setActiveSection] = useState<"products" | "cart" | "checkout">("products");
  const [focusedCartIndex, setFocusedCartIndex] = useState<number>(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const completeButtonRef = useRef<HTMLButtonElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
    const savedTax = localStorage.getItem("pos_global_tax");
    if (savedTax) setGlobalTaxRate(parseFloat(savedTax));
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pos/products");
      const data = await res.json();
      setProducts(
        (data.products || []).map((p: any) => ({
          ...p,
          mainImage: p.mainImage || "/placeholder.png",
          fifoBatches: p.fifoBatches || [],
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Customer search debounce
  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(customerSearch)}`
        );
        const data = await res.json();
        setCustomerSuggestions(data.customers || []);
        setShowCustomerDropdown(true);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectCustomer = (c: CustomerSuggestion) => {
    setCustomerId(c._id);
    setCustomerName(c.name);
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
    setCustomerSuggestions([]);
  };

  const clearCustomer = () => {
    setCustomerId(null);
    setCustomerName("Walk-in Customer");
    setCustomerSearch("");
    setCustomerSuggestions([]);
  };

  const saveSettings = () => {
    localStorage.setItem("pos_global_tax", globalTaxRate.toString());
    setCart((prev) =>
      prev.map((item) => computeItem({ ...item, taxRate: globalTaxRate }))
    );
    setShowSettings(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Cart helpers ──────────────────────────────────────────────────────

  const addToCart = useCallback(
    (product: POSProduct) => {
      if (product.stock === 0) {
        alert("Product out of stock");
        return;
      }

      setCart((prev) => {
        const totalInCart = prev
          .filter((i) => i.productId === product._id)
          .reduce((s, i) => s + i.quantity, 0);

        if (totalInCart >= product.stock) {
          alert("Cannot exceed available stock");
          return prev;
        }

        const { price: unitPrice, costPrice: unitCost } = getNextUnitPrice(
          product,
          totalInCart
        );
        const cartKey = `${product._id}__${unitPrice}`;

        const existing = prev.find((i) => i.cartKey === cartKey);
        if (existing) {
          return prev.map((i) =>
            i.cartKey === cartKey
              ? computeItem({ ...i, quantity: i.quantity + 1 })
              : i
          );
        }

        return [
          ...prev,
          computeItem({
            cartKey,
            productId: product._id,
            name: product.name,
            price: unitPrice,
            costPrice: unitCost,
            quantity: 1,
            taxRate: globalTaxRate,
          }),
        ];
      });

      setSearchTerm("");
    },
    [globalTaxRate]
  );

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => prev.filter((i) => i.cartKey !== cartKey));
  };

  const updateCartItem = (
    cartKey: string,
    patch: Partial<Omit<CartItem, "cartKey" | "taxAmount" | "total">>
  ) => {
    const item = cart.find((i) => i.cartKey === cartKey);
    if (!item) return;
    const product = products.find((p) => p._id === item.productId);

    setCart((prev) =>
      prev.map((i) => {
        if (i.cartKey !== cartKey) return i;
        const newQty = patch.quantity ?? i.quantity;

        if (product) {
          const otherQty = prev
            .filter((x) => x.productId === i.productId && x.cartKey !== cartKey)
            .reduce((s, x) => s + x.quantity, 0);

          if (otherQty + newQty > product.stock) {
            alert("Cannot exceed available stock");
            return i;
          }
        }
        return computeItem({ ...i, ...patch, quantity: newQty });
      })
    );
  };

  // ── Keyboard handler ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";

      if (!isInput) {
        if (e.key === "Enter") {
          if (barcodeBuffer.trim()) {
            const product = products.find((p) => p.sku === barcodeBuffer.trim());
            if (product) {
              addToCart(product);
              setHighlightedSku(product.sku);
              setTimeout(() => setHighlightedSku(null), 800);
            } else {
              alert(`SKU "${barcodeBuffer}" not found`);
            }
            setBarcodeBuffer("");
            return;
          }
          if (activeSection === "products" && focusedProductIndex >= 0) {
            const product = filteredProducts[focusedProductIndex];
            if (product) addToCart(product);
            return;
          }
          if (activeSection === "checkout") {
            if (cart.length > 0 && total > 0) processBill();
            return;
          }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          setBarcodeBuffer((prev) => prev + e.key);
          return;
        }

        if (e.key === "F1") {
          e.preventDefault();
          setActiveSection("products");
          searchRef.current?.focus();
        }
        if (e.key === "F2") {
          e.preventDefault();
          setActiveSection("cart");
          setFocusedCartIndex(cart.length > 0 ? 0 : -1);
        }
        if (e.key === "F3") {
          e.preventDefault();
          setActiveSection("checkout");
          completeButtonRef.current?.focus();
        }

        if (activeSection === "products") {
          const cols = 4;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setFocusedProductIndex((i) => Math.min(i + 1, filteredProducts.length - 1));
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setFocusedProductIndex((i) => Math.max(i - 1, 0));
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedProductIndex((i) => Math.min(i + cols, filteredProducts.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedProductIndex((i) => Math.max(i - cols, 0));
          }
        }

        if (activeSection === "cart" && cart.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedCartIndex((i) => Math.min(i + 1, cart.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedCartIndex((i) => Math.max(i - 1, 0));
          }
          if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            const item = cart[focusedCartIndex];
            if (item) updateCartItem(item.cartKey, { quantity: item.quantity + 1 });
          }
          if (e.key === "-") {
            e.preventDefault();
            const item = cart[focusedCartIndex];
            if (item) {
              if (item.quantity <= 1) removeFromCart(item.cartKey);
              else updateCartItem(item.cartKey, { quantity: item.quantity - 1 });
            }
          }
          if (e.key === "Delete") {
            const item = cart[focusedCartIndex];
            if (item) removeFromCart(item.cartKey);
          }
        }

        if (e.key === "Escape") {
          setSearchTerm("");
          setFocusedProductIndex(-1);
          setFocusedCartIndex(-1);
          setBarcodeBuffer("");
        }
      }

      if (isInput && document.activeElement === searchRef.current) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveSection("products");
          setFocusedProductIndex(0);
          searchRef.current?.blur();
        }
        if (e.key === "Enter" && filteredProducts.length > 0) {
          e.preventDefault();
          addToCart(
            filteredProducts[focusedProductIndex >= 0 ? focusedProductIndex : 0]
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    barcodeBuffer,
    products,
    filteredProducts,
    activeSection,
    focusedProductIndex,
    focusedCartIndex,
    cart,
    addToCart,
  ]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalTax = cart.reduce((s, i) => s + i.taxAmount, 0);
  const subtotalWithTax = subtotal + totalTax;
  const billDiscountAmount =
    billDiscountType === "percentage"
      ? subtotalWithTax * (billDiscountValue / 100)
      : Math.min(billDiscountValue, subtotalWithTax);
  const total = Math.max(0, subtotalWithTax - billDiscountAmount);

  // ── Auto-fill amount paid with total ───────────────────────────────────────
  // This is a derived value, not state. Just display it.
  const amountPaid = total;
  const change = amountPaid - total; // Will always be 0

  // ── Process sale ──────────────────────────────────────────────────────────

  const processBill = async () => {
    if (cart.length === 0) return alert("Cart is empty");

    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/pos/bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerId,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            costPrice: i.costPrice,
            taxRate: i.taxRate,
          })),
          billDiscountType,
          billDiscountValue,
          billDiscountAmount,
          paymentMethod,
          amountPaid: total, // Send total as amount paid
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setLastBill(data);
        setShowReceipt(true);
        fetchProducts();
      } else {
        alert(`Failed: ${data.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error processing bill");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetBill = () => {
    setCart([]);
    setCustomerName("Walk-in Customer");
    setCustomerId(null);
    setCustomerSearch("");
    setPaymentMethod("cash");
    setBillDiscountType("percentage");
    setBillDiscountValue(0);
    setShowReceipt(false);
    setFocusedProductIndex(-1);
    setFocusedCartIndex(-1);
  };

  // ── Print ─────────────────────────────────────────────────────────────────

  const printBill = () => {
    if (!lastBill) return;
    const itemCount = (lastBill.items || []).length;
    const estimatedHeight = 480 + itemCount * 55;
    const win = window.open("", "", `width=420,height=${estimatedHeight}`);
    if (!win) return;
    win.document.write(`
      <html><head><title>Receipt - ${lastBill.saleNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 20px 16px; font-size: 13px; background: #fff; color: #111; }
        .header { text-align: center; margin-bottom: 12px; }
        .store-name { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
        .subtitle { font-size: 11px; color: #555; margin-top: 2px; }
        .divider { border: none; border-top: 1px dashed #888; margin: 10px 0; }
        .divider-solid { border: none; border-top: 1px solid #333; margin: 10px 0; }
        .meta { font-size: 11px; margin-bottom: 2px; display: flex; justify-content: space-between; }
        .meta span:last-child { font-weight: 600; }
        .item-name { font-weight: 700; font-size: 12px; margin-bottom: 1px; }
        .item-row { display: flex; justify-content: space-between; padding-left: 8px; font-size: 11px; color: #333; }
        .item-tax { padding-left: 8px; font-size: 10px; color: #777; }
        .summary-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
        .summary-row.discount { color: #b45309; }
        .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin: 4px 0; }
        .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #555; }
        .badge { display: inline-block; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 1px 6px; font-size: 10px; }
        @media print { body { padding: 8px; } @page { margin: 0; size: 80mm auto; } }
      </style></head>
      <body>
        <div class="header">
          <div class="store-name">KHAS PURE FOOD</div>
          <div class="subtitle">Sale Receipt</div>
        </div>
        <hr class="divider-solid">
        <div class="meta"><span>Sale #</span><span>${lastBill.saleNumber}</span></div>
        <div class="meta"><span>Customer</span><span>${lastBill.customerName}</span></div>
        <div class="meta"><span>Date</span><span>${new Date(lastBill.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        <div class="meta"><span>Payment</span><span class="badge">${(lastBill.paymentMethod || "").toUpperCase()}</span></div>
        <hr class="divider">
        <div class="items">
          ${(lastBill.items || []).map((item: any) => `
            <div style="margin-bottom: 8px;">
              <div class="item-name">${item.name}</div>
              <div class="item-row">
                <span>${item.quantity} × Rs ${Number(item.price).toFixed(2)}</span>
                <span><strong>Rs ${(Number(item.price) * item.quantity).toFixed(2)}</strong></span>
              </div>
              ${item.taxRate > 0 ? `<div class="item-tax">Tax (${item.taxRate}%): Rs ${Number(item.taxAmount || 0).toFixed(2)}</div>` : ""}
            </div>
          `).join("")}
        </div>
        <hr class="divider">
        <div class="summary-row"><span>Subtotal</span><span>Rs ${Number(lastBill.subtotal).toFixed(2)}</span></div>
        <div class="summary-row"><span>Tax</span><span>Rs ${Number(lastBill.tax).toFixed(2)}</span></div>
        ${Number(lastBill.discount) > 0 ? `<div class="summary-row discount"><span>Discount</span><span>− Rs ${Number(lastBill.discount).toFixed(2)}</span></div>` : ""}
        <hr class="divider-solid">
        <div class="total-row"><span>TOTAL</span><span>Rs ${Number(lastBill.total).toFixed(2)}</span></div>
        <hr class="divider">
        <div class="footer"><div>Thank you for shopping at Khas Pure Food!</div><div style="margin-top:4px">Visit us again 🌿</div></div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  // ── Receipt screen ─────────────────────────────────────────────────────────

  if (showReceipt && lastBill) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <Card className="w-full max-w-lg p-8 bg-white border-0 shadow-2xl rounded-3xl">
          <div className="mb-8 text-center">
            <div className="inline-flex p-4 mb-4 shadow-lg bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl">
              <CheckCircle className="text-white h-14 w-14" />
            </div>
            <h1 className="text-3xl font-black text-gray-900">Payment Successful!</h1>
            <p className="mt-1 text-gray-500">Sale #{lastBill.saleNumber}</p>
            {lastBill.customerName !== "Walk-in Customer" && (
              <p className="mt-1 text-sm font-semibold text-emerald-600">
                Customer: {lastBill.customerName}
              </p>
            )}
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-2.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold">Rs {Number(lastBill.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span>
              <span className="font-semibold">Rs {Number(lastBill.tax).toFixed(2)}</span>
            </div>
            {lastBill.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span className="font-semibold">− Rs {Number(lastBill.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t-2 border-gray-200 border-dashed">
              <span className="text-lg font-black text-gray-900">Total Paid</span>
              <span className="text-2xl font-black text-emerald-600">
                Rs {Number(lastBill.total).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={printBill}
              className="flex-1 h-12 font-bold text-white shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" /> Print Receipt
            </Button>
            <Button
              onClick={resetBill}
              className="flex-1 h-12 font-bold text-white shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> New Sale
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Main POS ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 bg-slate-100">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl">
              <ShoppingCart className="text-white h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Point of Sale</h1>
              <p className="text-sm text-gray-500">FIFO batch pricing · real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow border border-gray-200 text-xs text-gray-500">
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px]">F1</kbd> Products
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px] ml-1">F2</kbd> Cart
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px] ml-1">F3</kbd> Checkout
            </div>
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 shadow rounded-xl">
              <Barcode className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Scanner Active</span>
              {barcodeBuffer && (
                <span className="ml-2 font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                  {barcodeBuffer}
                </span>
              )}
            </div>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              className="h-10 px-4 font-bold text-white shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-xl"
            >
              <Settings className="w-4 h-4 mr-2" />
              Tax Settings
            </Button>
          </div>
        </div>

        {/* Tax settings panel */}
        {showSettings && (
          <Card className="p-5 mb-5 bg-white border-2 border-purple-200 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-black text-gray-900">
                <Percent className="w-5 h-5 text-purple-600" /> Tax Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-w-xs space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <Percent className="w-4 h-4 text-blue-500" /> Default Tax Rate (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={globalTaxRate}
                onChange={(e) => setGlobalTaxRate(parseFloat(e.target.value) || 0)}
                className="text-lg font-bold border-2 border-gray-200 h-11 focus:border-blue-400 rounded-xl"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <Button
                onClick={saveSettings}
                className="px-6 font-bold text-white shadow-lg h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-xl"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Save & Apply to Cart
              </Button>
              <Button
                onClick={() => setGlobalTaxRate(17)}
                variant="outline"
                className="px-6 font-bold border-2 border-gray-300 h-11 hover:bg-gray-50 rounded-xl"
              >
                Reset to 17%
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* ── Products Grid ── */}
          <div className="space-y-4 lg:col-span-3">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <Input
                ref={searchRef}
                placeholder="Search by name or SKU… (F1)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setFocusedProductIndex(0);
                }}
                onFocus={() => setActiveSection("products")}
                className="h-12 bg-white border-2 border-gray-200 shadow-sm pl-11 focus:border-blue-400 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 pb-2">
              {loading ? (
                <div className="flex items-center justify-center py-20 col-span-full">
                  <div className="w-10 h-10 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-gray-400 col-span-full">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No products found</p>
                </div>
              ) : (
                filteredProducts.map((product, idx) => {
                  const inCartQty = cart
                    .filter((i) => i.productId === product._id)
                    .reduce((s, i) => s + i.quantity, 0);

                  const { price: nextPrice } = getNextUnitPrice(product, inCartQty);
                  const isMultiBatch =
                    product.fifoBatches.length > 1 &&
                    nextPrice !== product.retailPrice;

                  return (
                    <Card
                      key={product._id}
                      onClick={() => product.stock > 0 && addToCart(product)}
                      tabIndex={activeSection === "products" ? 0 : -1}
                      className={`group cursor-pointer overflow-hidden transition-all duration-200 border-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 outline-none ${
                        highlightedSku === product.sku
                          ? "border-blue-500 shadow-lg scale-105"
                          : focusedProductIndex === idx && activeSection === "products"
                          ? "border-indigo-500 ring-2 ring-indigo-300 shadow-lg"
                          : product.stock === 0
                          ? "opacity-60 cursor-not-allowed border-gray-200"
                          : "border-transparent hover:border-blue-300"
                      }`}
                    >
                      <div className="relative overflow-hidden bg-gray-100 h-28">
                        <Image
                          src={product.mainImage || "/placeholder.png"}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          unoptimized
                        />
                        {product.stock === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                              Out of Stock
                            </span>
                          </div>
                        )}
                        {product.fifoBatches.length > 1 && (
                          <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Layers className="h-2.5 w-2.5" />
                            {product.fifoBatches.length}
                          </div>
                        )}
                        {focusedProductIndex === idx && activeSection === "products" && (
                          <div className="absolute top-1 right-1 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            ENTER
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="mb-1 text-xs font-semibold leading-tight text-gray-800 line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mb-2">
                          {product.unitSize}{product.unitType} · {product.sku}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            {isMultiBatch ? (
                              <div>
                                <span className="text-sm font-black text-amber-600">
                                  Rs {nextPrice}
                                </span>
                                <span className="text-[9px] text-gray-400 ml-1 line-through">
                                  {product.retailPrice}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-black text-emerald-600">
                                Rs {nextPrice}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              product.stock > 10
                                ? "bg-emerald-100 text-emerald-700"
                                : product.stock > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {product.stock}
                          </span>
                        </div>
                        {inCartQty > 0 && (
                          <div className="mt-1 text-[9px] text-blue-600 font-bold">
                            {inCartQty} in cart
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Cart + Checkout ── */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card className="flex flex-col flex-1 overflow-hidden bg-white border-0 shadow-xl rounded-2xl">

              {/* Cart header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3.5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                  <ShoppingCart className="w-4 h-4" />
                  Order ({cart.length} {cart.length === 1 ? "line" : "lines"})
                  <kbd className="bg-white/20 text-white/80 text-[9px] px-1.5 py-0.5 rounded font-mono ml-1">F2</kbd>
                </h2>
                {cart.length > 0 && (
                  <button onClick={resetBill} className="transition-colors text-white/70 hover:text-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[280px]">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Scan or click to add items</p>
                    <p className="mt-1 text-xs opacity-70">
                      Multiple batches split into separate lines
                    </p>
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const firstLineForProduct = cart.findIndex(
                      (i) => i.productId === item.productId
                    );
                    const isSecondaryBatchLine = firstLineForProduct !== idx;

                    return (
                      <div
                        key={item.cartKey}
                        className={`rounded-xl border overflow-hidden transition-all ${
                          focusedCartIndex === idx && activeSection === "cart"
                            ? "border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50"
                            : isSecondaryBatchLine
                            ? "bg-amber-50 border-amber-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {item.name}
                              {isSecondaryBatchLine && (
                                <span className="ml-1 text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                                  Batch 2
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Rs {item.price} / unit
                              <span className="ml-1 text-blue-500">
                                · +Rs {item.taxAmount.toFixed(2)} tax
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                if (item.quantity <= 1) removeFromCart(item.cartKey);
                                else
                                  updateCartItem(item.cartKey, {
                                    quantity: item.quantity - 1,
                                  });
                              }}
                              className="flex items-center justify-center w-6 h-6 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="text-xs font-bold text-center text-gray-800 w-7">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartItem(item.cartKey, {
                                  quantity: item.quantity + 1,
                                })
                              }
                              className="flex items-center justify-center w-6 h-6 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.cartKey)}
                              className="flex items-center justify-center w-6 h-6 ml-1 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-red-50 hover:border-red-300"
                            >
                              <X className="h-2.5 w-2.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-3 pt-1 pb-2 border-t border-slate-200">
                          <span className="text-[10px] text-gray-500">
                            Tax: {item.taxRate}%
                          </span>
                          <span className="text-sm font-black text-emerald-600">
                            Rs {item.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Checkout panel */}
              <div className="p-4 space-y-3 border-t border-gray-100">

                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">Rs {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax ({globalTaxRate}%)</span>
                    <span className="font-medium">Rs {totalTax.toFixed(2)}</span>
                  </div>
                  {billDiscountAmount > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Discount</span>
                      <span className="font-medium">
                        − Rs {billDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-1.5 flex justify-between">
                    <span className="font-black text-gray-900">Total Due</span>
                    <span className="text-lg font-black text-indigo-600">
                      Rs {total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Customer selection */}
                <div className="relative" ref={customerDropdownRef}>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <UserSearch className="h-3.5 w-3.5 text-blue-500" />
                    Customer
                  </label>
                  <div className="relative">
                    <User className="absolute z-10 w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                    <Input
                      ref={customerSearchRef}
                      placeholder="Search customer or type name…"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerName(e.target.value || "Walk-in Customer");
                        if (!e.target.value) setCustomerId(null);
                      }}
                      onFocus={() =>
                        customerSearch.length >= 2 && setShowCustomerDropdown(true)
                      }
                      className="pr-8 text-sm border-gray-200 rounded-lg pl-9 h-9 focus:border-blue-400"
                    />
                    {(customerSearch || customerId) && (
                      <button
                        onClick={clearCustomer}
                        className="absolute text-gray-400 -translate-y-1/2 right-2 top-1/2 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {customerId && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      Linked to customer account
                    </div>
                  )}
                  {showCustomerDropdown && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 overflow-hidden bg-white border border-gray-200 shadow-xl rounded-xl">
                      {customerSuggestions.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">
                            {c.email}{c.phone ? ` · ${c.phone}` : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {showCustomerDropdown &&
                    customerSearch.length >= 2 &&
                    customerSuggestions.length === 0 && (
                      <div className="absolute z-50 w-full px-4 py-3 mt-1 text-xs text-gray-400 bg-white border border-gray-200 shadow-xl rounded-xl">
                        No customers found — billing as "{customerSearch}"
                      </div>
                    )}
                </div>

                {/* Bill discount */}
                <div className="p-3 space-y-2 border border-orange-200 bg-orange-50 rounded-xl">
                  <label className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Bill Discount
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={billDiscountType}
                      onChange={(e) =>
                        setBillDiscountType(
                          e.target.value as "percentage" | "fixed"
                        )
                      }
                      className="px-2 text-sm font-bold bg-white border-2 border-orange-200 rounded-lg h-9 focus:outline-none focus:border-orange-400"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">Rs</option>
                    </select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={billDiscountValue || ""}
                      onChange={(e) =>
                        setBillDiscountValue(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                      className="flex-1 text-sm font-bold bg-white border-2 border-orange-200 rounded-lg h-9 focus:border-orange-400"
                    />
                    {billDiscountValue > 0 && (
                      <button
                        onClick={() => setBillDiscountValue(0)}
                        className="flex items-center justify-center bg-white border-2 border-orange-200 rounded-lg w-9 h-9 hover:bg-red-50 hover:border-red-300 shrink-0"
                      >
                        <X className="h-3.5 w-3.5 text-orange-400" />
                      </button>
                    )}
                  </div>
                  {billDiscountAmount > 0 && (
                    <p className="text-xs font-semibold text-orange-600">
                      Saving Rs {billDiscountAmount.toFixed(2)} on this bill
                    </p>
                  )}
                </div>

                {/* Payment method - ONLY Cash and Card */}
                <div className="grid grid-cols-2 gap-2">
                  {(["cash", "card"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${
                        paymentMethod === m
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {m === "cash" ? "💵 Cash" : "🏦 Card"}
                    </button>
                  ))}
                </div>

                {/* Amount Due Display */}
                <div className="p-4 border-2 bg-emerald-50 border-emerald-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase text-emerald-700">Amount Due</p>
                      <p className="text-3xl font-black text-emerald-600">
                        Rs {total.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-xs text-emerald-600">Payment Method</p>
                      <p className="text-sm font-bold capitalize text-emerald-700">
                        {paymentMethod === "cash" ? "💵 Cash" : "🏦 Card/Bank"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    ref={completeButtonRef}
                    onClick={processBill}
                    disabled={isProcessing || cart.length === 0}
                    className="flex-1 h-12 font-bold text-white shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Sale
                        <kbd className="ml-2 bg-white/20 text-white/80 text-[9px] px-1.5 py-0.5 rounded font-mono">
                          Enter
                        </kbd>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetBill}
                    variant="outline"
                    className="h-12 px-4 border-2 border-gray-300 hover:bg-gray-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-white border-0 shadow-md bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <p className="mb-1 text-xs opacity-80">Total Items</p>
                <p className="text-3xl font-black">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </p>
              </Card>
              <Card className="p-4 text-white border-0 shadow-md bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-xs opacity-80">Savings</p>
                    <p className="text-xl font-black">
                      Rs {billDiscountAmount.toFixed(0)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 opacity-60" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}