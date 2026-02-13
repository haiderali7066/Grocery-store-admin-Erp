"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  weight?: string;
  gst?: number; // per-product GST rate (optional, falls back to store rate)
}

interface TaxSettings {
  taxEnabled: boolean;
  taxRate: number; // e.g. 17
  taxName: string; // e.g. "GST"
  shippingCost: number;
  freeShippingThreshold: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  taxName: string;
  taxEnabled: boolean;
  shippingCost: number;
  total: number;
  // legacy aliases so existing pages don't break
  gstAmount: number;
}

// ── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tax, setTax] = useState<TaxSettings>({
    taxEnabled: true,
    taxRate: 17,
    taxName: "GST",
    shippingCost: 0,
    freeShippingThreshold: 0,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  // Fetch tax + shipping settings once on mount
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings;
        if (!s) return;
        setTax({
          taxEnabled: s.taxEnabled ?? true,
          taxRate: s.taxRate ?? 17,
          taxName: s.taxName || "GST",
          shippingCost: s.shippingCost ?? 0,
          freeShippingThreshold: s.freeShippingThreshold ?? 0,
        });
      })
      .catch(() => {
        // keep defaults on error — store still functions
      });
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i,
        );
      }
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem("cart");
  }, []);

  // ── Computed values ────────────────────────────────────────────────────────

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Tax: use store-level rate; if a product has its own gst field that takes priority
  const taxAmount = tax.taxEnabled
    ? items.reduce((sum, i) => {
        const rate = i.gst != null ? i.gst : tax.taxRate;
        return sum + (i.price * i.quantity * rate) / 100;
      }, 0)
    : 0;

  // Shipping: free if threshold met and threshold > 0
  const shippingCost =
    tax.freeShippingThreshold > 0 && subtotal >= tax.freeShippingThreshold
      ? 0
      : tax.shippingCost;

  const total = subtotal + taxAmount + shippingCost;

  const value: CartContextValue = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    taxAmount,
    taxRate: tax.taxRate,
    taxName: tax.taxName,
    taxEnabled: tax.taxEnabled,
    shippingCost,
    total,
    // legacy alias
    gstAmount: taxAmount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
