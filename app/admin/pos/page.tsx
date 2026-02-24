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
  ChevronDown,
} from "lucide-react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
interface POSProduct {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  unitSize: number;
  unitType: string;
  stock: number;
  mainImage?: string;
  gst?: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
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

// ─── Pure computation ─────────────────────────────────────────────────────────
function computeItem(item: Omit<CartItem, "taxAmount" | "total">): CartItem {
  const base = item.price * item.quantity;
  const taxAmount = base * (item.taxRate / 100);
  const total = base + taxAmount;
  return { ...item, taxAmount, total };
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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "online">("cash");
  const [amountPaid, setAmountPaid] = useState("");
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

  // Keyboard navigation state
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);
  const [activeSection, setActiveSection] = useState<"products" | "cart" | "checkout">("products");
  const [focusedCartIndex, setFocusedCartIndex] = useState<number>(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const amountPaidRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
    const savedTax = localStorage.getItem("pos_global_tax");
    if (savedTax) setGlobalTaxRate(parseFloat(savedTax));
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/pos/products");
      const data = await res.json();
      setProducts(
        (data.products || []).map((p: any) => ({
          ...p,
          mainImage: p.mainImage || "/placeholder.png",
        })),
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
        const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearch)}`);
        const data = await res.json();
        setCustomerSuggestions(data.customers || []);
        setShowCustomerDropdown(true);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
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
    setCart((prev) => prev.map((item) => computeItem({ ...item, taxRate: globalTaxRate })));
    setShowSettings(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = useCallback((product: POSProduct) => {
    if (product.stock === 0) return alert("Product out of stock");
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert("Cannot exceed available stock");
          return prev;
        }
        return prev.map((i) =>
          i.productId === product._id
            ? computeItem({ ...i, quantity: i.quantity + 1 })
            : i,
        );
      }
      return [
        ...prev,
        computeItem({
          productId: product._id,
          name: product.name,
          price: product.retailPrice,
          quantity: 1,
          taxRate: globalTaxRate,
        }),
      ];
    });
    setSearchTerm("");
  }, [globalTaxRate]);

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateCartItem = (productId: string, patch: Partial<Omit<CartItem, "taxAmount" | "total">>) => {
    const product = products.find((p) => p._id === productId);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const newQty = patch.quantity ?? item.quantity;
        if (product && newQty > product.stock) {
          alert("Cannot exceed available stock");
          return item;
        }
        return computeItem({ ...item, ...patch });
      }),
    );
  };

  // ── Global Keyboard Handler ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";

      // Barcode scanning (when not in input)
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
          // Enter on focused product
          if (activeSection === "products" && focusedProductIndex >= 0) {
            const product = filteredProducts[focusedProductIndex];
            if (product) addToCart(product);
            return;
          }
          // Enter in checkout section → process bill
          if (activeSection === "checkout") {
            if (cart.length > 0 && amountPaid && parseFloat(amountPaid) >= total) {
              processBill();
            }
            return;
          }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          setBarcodeBuffer((prev) => prev + e.key);
          return;
        }

        // Section navigation
        if (e.key === "F1") { e.preventDefault(); setActiveSection("products"); searchRef.current?.focus(); }
        if (e.key === "F2") { e.preventDefault(); setActiveSection("cart"); setFocusedCartIndex(cart.length > 0 ? 0 : -1); }
        if (e.key === "F3") { e.preventDefault(); setActiveSection("checkout"); amountPaidRef.current?.focus(); }

        // Product grid navigation
        if (activeSection === "products") {
          const cols = 4;
          if (e.key === "ArrowRight") { e.preventDefault(); setFocusedProductIndex(i => Math.min(i + 1, filteredProducts.length - 1)); }
          if (e.key === "ArrowLeft") { e.preventDefault(); setFocusedProductIndex(i => Math.max(i - 1, 0)); }
          if (e.key === "ArrowDown") { e.preventDefault(); setFocusedProductIndex(i => Math.min(i + cols, filteredProducts.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setFocusedProductIndex(i => Math.max(i - cols, 0)); }
        }

        // Cart navigation
        if (activeSection === "cart" && cart.length > 0) {
          if (e.key === "ArrowDown") { e.preventDefault(); setFocusedCartIndex(i => Math.min(i + 1, cart.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setFocusedCartIndex(i => Math.max(i - 1, 0)); }
          if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            const item = cart[focusedCartIndex];
            if (item) updateCartItem(item.productId, { quantity: item.quantity + 1 });
          }
          if (e.key === "-") {
            e.preventDefault();
            const item = cart[focusedCartIndex];
            if (item) {
              if (item.quantity <= 1) removeFromCart(item.productId);
              else updateCartItem(item.productId, { quantity: item.quantity - 1 });
            }
          }
          if (e.key === "Delete") {
            const item = cart[focusedCartIndex];
            if (item) removeFromCart(item.productId);
          }
        }

        // Payment shortcuts
        if (e.key === "F4") { e.preventDefault(); setAmountPaid("500"); }
        if (e.key === "F5") { e.preventDefault(); setAmountPaid("1000"); }
        if (e.key === "F6") { e.preventDefault(); setAmountPaid("2000"); }
        if (e.key === "F7") { e.preventDefault(); setAmountPaid("5000"); }
        if (e.key === "Escape") { setSearchTerm(""); setFocusedProductIndex(-1); setFocusedCartIndex(-1); setBarcodeBuffer(""); }
      }

      // When in search input
      if (isInput && document.activeElement === searchRef.current) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveSection("products");
          setFocusedProductIndex(0);
          searchRef.current?.blur();
        }
        if (e.key === "Enter" && filteredProducts.length > 0) {
          e.preventDefault();
          addToCart(filteredProducts[focusedProductIndex >= 0 ? focusedProductIndex : 0]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeBuffer, products, filteredProducts, activeSection, focusedProductIndex, focusedCartIndex, cart, amountPaid, addToCart]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalTax = cart.reduce((s, i) => s + i.taxAmount, 0);
  const subtotalWithTax = subtotal + totalTax;
  const billDiscountAmount =
    billDiscountType === "percentage"
      ? subtotalWithTax * (billDiscountValue / 100)
      : Math.min(billDiscountValue, subtotalWithTax);
  const total = Math.max(0, subtotalWithTax - billDiscountAmount);
  const paid = parseFloat(amountPaid || "0");
  const change = paid - total;

  // ── Process sale ──────────────────────────────────────────────────────────
  const processBill = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (!amountPaid || paid < total) return alert("Amount paid must be ≥ total");

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
            taxRate: i.taxRate,
          })),
          billDiscountType,
          billDiscountValue,
          billDiscountAmount,
          paymentMethod,
          amountPaid: paid,
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
    setAmountPaid("");
    setPaymentMethod("cash");
    setBillDiscountType("percentage");
    setBillDiscountValue(0);
    setShowReceipt(false);
    setFocusedProductIndex(-1);
    setFocusedCartIndex(-1);
  };

  // ── Responsive Print ──────────────────────────────────────────────────────
  const printBill = () => {
    if (!lastBill) return;
    const itemCount = (lastBill.items || []).length;
    // Base height + per-item height
    const estimatedHeight = 480 + itemCount * 55;
    const win = window.open("", "", `width=420,height=${estimatedHeight}`);
    if (!win) return;
    win.document.write(`
      <html><head><title>Receipt - ${lastBill.saleNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Courier New', monospace;
          width: 300px;
          margin: 0 auto;
          padding: 20px 16px;
          font-size: 13px;
          background: #fff;
          color: #111;
        }
        .header { text-align: center; margin-bottom: 12px; }
        .store-name { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
        .subtitle { font-size: 11px; color: #555; margin-top: 2px; }
        .divider { border: none; border-top: 1px dashed #888; margin: 10px 0; }
        .divider-solid { border: none; border-top: 1px solid #333; margin: 10px 0; }
        .meta { font-size: 11px; margin-bottom: 2px; display: flex; justify-content: space-between; }
        .meta span:last-child { font-weight: 600; }
        .items { margin: 6px 0; }
        .item-name { font-weight: 700; font-size: 12px; margin-bottom: 1px; }
        .item-row { display: flex; justify-content: space-between; padding-left: 8px; font-size: 11px; color: #333; }
        .item-tax { padding-left: 8px; font-size: 10px; color: #777; }
        .summary-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
        .summary-row.discount { color: #b45309; }
        .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin: 4px 0; }
        .change-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #1d4ed8; margin: 3px 0; }
        .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #555; }
        .badge { display: inline-block; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 1px 6px; font-size: 10px; }
        @media print {
          body { padding: 8px; }
          @page { margin: 0; size: 80mm auto; }
        }
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
              ${item.taxRate > 0 ? `<div class="item-tax">Tax (${item.taxRate}%): Rs ${Number(item.taxAmount || 0).toFixed(2)}</div>` : ''}
            </div>
          `).join("")}
        </div>
        <hr class="divider">
        <div class="summary-row"><span>Subtotal</span><span>Rs ${Number(lastBill.subtotal).toFixed(2)}</span></div>
        <div class="summary-row"><span>Tax</span><span>Rs ${Number(lastBill.tax).toFixed(2)}</span></div>
        ${Number(lastBill.discount) > 0 ? `<div class="summary-row discount"><span>Discount</span><span>− Rs ${Number(lastBill.discount).toFixed(2)}</span></div>` : ""}
        <hr class="divider-solid">
        <div class="total-row"><span>TOTAL</span><span>Rs ${Number(lastBill.total).toFixed(2)}</span></div>
        <div class="summary-row"><span>Amount Paid</span><span>Rs ${Number(lastBill.amountPaid).toFixed(2)}</span></div>
        <div class="change-row"><span>Change Due</span><span>Rs ${Number(lastBill.change).toFixed(2)}</span></div>
        <hr class="divider">
        <div class="footer">
          <div>Thank you for shopping at Khas Pure Food!</div>
          <div style="margin-top: 4px;">Visit us again 🌿</div>
        </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  // ── Receipt Screen ─────────────────────────────────────────────────────────
  if (showReceipt && lastBill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 shadow-2xl border-0 bg-white rounded-3xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg mb-4">
              <CheckCircle className="h-14 w-14 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900">Payment Successful!</h1>
            <p className="text-gray-500 mt-1">Sale #{lastBill.saleNumber}</p>
            {lastBill.customerName !== "Walk-in Customer" && (
              <p className="text-sm text-emerald-600 font-semibold mt-1">Customer: {lastBill.customerName}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-2.5">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">Rs {Number(lastBill.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Tax</span>
              <span className="font-semibold">Rs {Number(lastBill.tax).toFixed(2)}</span>
            </div>
            {lastBill.discount > 0 && (
              <div className="flex justify-between text-emerald-600 text-sm">
                <span>Discount</span>
                <span className="font-semibold">− Rs {Number(lastBill.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t-2 border-dashed border-gray-200 pt-3 flex justify-between">
              <span className="text-lg font-black text-gray-900">Total</span>
              <span className="text-2xl font-black text-emerald-600">Rs {Number(lastBill.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm pt-1">
              <span>Amount Paid</span>
              <span className="font-semibold">Rs {Number(lastBill.amountPaid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span className="font-semibold">Change Due</span>
              <span className="text-xl font-black">Rs {Number(lastBill.change).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={printBill}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg"
            >
              <Printer className="h-4 w-4 mr-2" /> Print Receipt
            </Button>
            <Button
              onClick={resetBill}
              className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" /> New Sale
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Main POS ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-2xl shadow-lg">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Point of Sale</h1>
              <p className="text-gray-500 text-sm">Fast & efficient billing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Keyboard shortcuts hint */}
            <div className="hidden md:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow border border-gray-200 text-xs text-gray-500">
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px]">F1</kbd> Products
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px] ml-1">F2</kbd> Cart
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px] ml-1">F3</kbd> Checkout
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px] ml-1">Enter</kbd> Add/Pay
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow border border-gray-200 text-sm text-gray-600">
              <Barcode className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Scanner Active</span>
              {barcodeBuffer && (
                <span className="ml-2 font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                  {barcodeBuffer}
                </span>
              )}
            </div>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              className="h-10 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg"
            >
              <Settings className="h-4 w-4 mr-2" />
              Tax Settings
            </Button>
          </div>
        </div>

        {/* Tax Settings Panel */}
        {showSettings && (
          <Card className="mb-5 p-5 bg-white border-2 border-purple-200 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Percent className="h-5 w-5 text-purple-600" />
                Tax Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-w-xs space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Percent className="h-4 w-4 text-blue-500" />
                Default Tax Rate (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={globalTaxRate}
                onChange={(e) => setGlobalTaxRate(parseFloat(e.target.value) || 0)}
                className="h-11 text-lg font-bold border-2 border-gray-200 focus:border-blue-400 rounded-xl"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <Button
                onClick={saveSettings}
                className="h-11 px-6 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save & Apply to Cart
              </Button>
              <Button
                onClick={() => setGlobalTaxRate(17)}
                variant="outline"
                className="px-6 h-11 border-2 border-gray-300 hover:bg-gray-50 rounded-xl font-bold"
              >
                Reset to 17%
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Products Grid ── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <Input
                ref={searchRef}
                placeholder="Search by name or SKU… (F1 to focus)"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setFocusedProductIndex(0); }}
                onFocus={() => setActiveSection("products")}
                className="pl-11 h-12 border-2 border-gray-200 focus:border-blue-400 rounded-xl bg-white shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 pb-2">
              {loading ? (
                <div className="col-span-full flex items-center justify-center py-20">
                  <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-16 text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No products found</p>
                </div>
              ) : (
                filteredProducts.map((product, idx) => (
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
                    <div className="relative h-28 bg-gray-100 overflow-hidden">
                      <Image
                        src={product.mainImage || "/placeholder.png"}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded-full">
                            Out of Stock
                          </span>
                        </div>
                      )}
                      {focusedProductIndex === idx && activeSection === "products" && (
                        <div className="absolute top-1 right-1 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          ENTER
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="font-semibold text-xs leading-tight text-gray-800 mb-1 line-clamp-2">{product.name}</p>
                      <p className="text-[10px] text-gray-400 mb-2">
                        {product.unitSize}{product.unitType} · {product.sku}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-emerald-600">Rs {product.retailPrice}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          product.stock > 10
                            ? "bg-emerald-100 text-emerald-700"
                            : product.stock > 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {product.stock}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* ── Cart + Checkout ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card className="flex-1 bg-white border-0 shadow-xl rounded-2xl overflow-hidden flex flex-col">
              {/* Cart header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3.5 flex items-center justify-between">
                <h2 className="text-white font-bold flex items-center gap-2 text-sm">
                  <ShoppingCart className="h-4 w-4" />
                  Order ({cart.length} items)
                  <kbd className="bg-white/20 text-white/80 text-[9px] px-1.5 py-0.5 rounded font-mono ml-1">F2</kbd>
                </h2>
                {cart.length > 0 && (
                  <button onClick={resetBill} className="text-white/70 hover:text-white transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[280px]">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Scan or click to add items</p>
                    <p className="text-xs mt-1 opacity-70">Press F1 + arrows to navigate products</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={item.productId}
                      className={`rounded-xl border overflow-hidden transition-all ${
                        focusedCartIndex === idx && activeSection === "cart"
                          ? "border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs text-gray-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-400">
                            Rs {item.price} / unit
                            <span className="text-blue-500 ml-1">· +Rs {item.taxAmount.toFixed(2)} tax</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              if (item.quantity <= 1) removeFromCart(item.productId);
                              else updateCartItem(item.productId, { quantity: item.quantity - 1 });
                            }}
                            className="w-6 h-6 bg-white border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 shadow-sm"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-gray-800 text-xs">{item.quantity}</span>
                          <button
                            onClick={() => updateCartItem(item.productId, { quantity: item.quantity + 1 })}
                            className="w-6 h-6 bg-white border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 shadow-sm"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="w-6 h-6 bg-white border border-gray-300 rounded-md flex items-center justify-center hover:bg-red-50 hover:border-red-300 shadow-sm ml-1"
                          >
                            <X className="h-2.5 w-2.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-3 pb-2 pt-1 border-t border-slate-200">
                        <span className="text-[10px] text-gray-500">Tax: {item.taxRate}%</span>
                        <span className="text-sm font-black text-emerald-600">Rs {item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Checkout panel ── */}
              <div className="border-t border-gray-100 p-4 space-y-3">
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
                      <span className="font-medium">− Rs {billDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-1.5 flex justify-between">
                    <span className="font-black text-gray-900">Total</span>
                    <span className="font-black text-indigo-600 text-lg">Rs {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* ── Customer Selection ── */}
                <div className="relative" ref={customerDropdownRef}>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <UserSearch className="h-3.5 w-3.5 text-blue-500" />
                    Customer
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <Input
                      ref={customerSearchRef}
                      placeholder="Search customer or type name…"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerName(e.target.value || "Walk-in Customer");
                        if (!e.target.value) setCustomerId(null);
                      }}
                      onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                      className="pl-9 h-9 text-sm border-gray-200 focus:border-blue-400 rounded-lg pr-8"
                    />
                    {(customerSearch || customerId) && (
                      <button
                        onClick={clearCustomer}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {customerId && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                      <CheckCircle className="h-3 w-3" />
                      Linked to customer account · history will update
                    </div>
                  )}
                  {showCustomerDropdown && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                      {customerSuggestions.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {showCustomerDropdown && customerSearch.length >= 2 && customerSuggestions.length === 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 px-4 py-3 text-xs text-gray-400">
                      No customers found — billing as "{customerSearch}"
                    </div>
                  )}
                </div>

                {/* ── Bill Discount ── */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
                  <label className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Bill Discount
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={billDiscountType}
                      onChange={(e) => setBillDiscountType(e.target.value as "percentage" | "fixed")}
                      className="h-9 border-2 border-orange-200 rounded-lg px-2 font-bold text-sm bg-white focus:outline-none focus:border-orange-400"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">Rs</option>
                    </select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={billDiscountValue || ""}
                      onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="flex-1 h-9 text-sm font-bold border-2 border-orange-200 focus:border-orange-400 rounded-lg bg-white"
                    />
                    {billDiscountValue > 0 && (
                      <button
                        onClick={() => setBillDiscountValue(0)}
                        className="w-9 h-9 flex items-center justify-center bg-white border-2 border-orange-200 rounded-lg hover:bg-red-50 hover:border-red-300 shrink-0"
                      >
                        <X className="h-3.5 w-3.5 text-orange-400" />
                      </button>
                    )}
                  </div>
                  {billDiscountAmount > 0 && (
                    <p className="text-xs text-orange-600 font-semibold">
                      Saving Rs {billDiscountAmount.toFixed(2)} on this bill
                    </p>
                  )}
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(["cash", "card", "online"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                        paymentMethod === m
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Amount paid */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                    <label className="text-xs font-bold text-gray-700">
                      Amount Paid (Rs)
                      <kbd className="ml-2 bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-mono">F3</kbd>
                    </label>
                  </div>
                  <Input
                    ref={amountPaidRef}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    onFocus={() => setActiveSection("checkout")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && cart.length > 0 && amountPaid && paid >= total) {
                        processBill();
                      }
                    }}
                    className="h-11 text-lg font-bold border-2 border-gray-200 focus:border-indigo-400 rounded-xl"
                  />
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[500, 1000, 2000, 5000].map((a, i) => (
                      <button
                        key={a}
                        onClick={() => setAmountPaid(a.toString())}
                        className="bg-gray-100 hover:bg-indigo-600 hover:text-white text-gray-700 py-1.5 rounded-lg text-xs font-bold transition-all border border-gray-200 hover:border-indigo-600"
                      >
                        {a}
                        <span className="block text-[9px] opacity-60">F{i + 4}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change due */}
                {paid >= total && total > 0 && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-sm font-bold text-emerald-700">Change Due</span>
                    <span className="text-2xl font-black text-emerald-600">Rs {change.toFixed(2)}</span>
                  </div>
                )}

                {amountPaid && paid < total && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-600 font-semibold text-center">
                    Short by Rs {(total - paid).toFixed(2)}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={processBill}
                    disabled={isProcessing || cart.length === 0 || !amountPaid || paid < total}
                    className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Sale
                        <kbd className="ml-2 bg-white/20 text-white/80 text-[9px] px-1.5 py-0.5 rounded font-mono">Enter</kbd>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetBill}
                    variant="outline"
                    className="px-4 h-12 border-2 border-gray-300 hover:bg-gray-50 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white p-4 border-0 rounded-xl shadow-md">
                <p className="text-xs opacity-80 mb-1">Total Items</p>
                <p className="text-3xl font-black">{cart.reduce((s, i) => s + i.quantity, 0)}</p>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500 to-rose-500 text-white p-4 border-0 rounded-xl shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80 mb-1">Savings</p>
                    <p className="text-xl font-black">Rs {billDiscountAmount.toFixed(0)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 opacity-60" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}