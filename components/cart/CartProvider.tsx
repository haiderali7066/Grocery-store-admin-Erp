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
  gst?: number;
  discount?: number;
  // Bundle-specific fields
  isBundle?: boolean;
  bundleId?: string;
  bundleProducts?: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }[];
}

// ── BundleCartInput: what callers pass to addBundle() ─────────────────────────
export interface BundleCartInput {
  bundleId: string;
  name: string;
  bundlePrice: number;     // final price after all discounts
  originalPrice: number;   // sum of retail prices (for savings display)
  image?: string;
  products: {
    productId: string;     // MongoDB ObjectId string — REQUIRED for order API
    name: string;
    quantity: number;
    retailPrice: number;
    image?: string;
  }[];
}

interface TaxSettings {
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
  shippingCost: number;
  freeShippingThreshold: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  addBundle: (bundle: BundleCartInput) => void;
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
  // legacy alias
  gstAmount: number;
}

// ── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [tax, setTax] = useState<TaxSettings>({
    taxEnabled: true,
    taxRate: 17,
    taxName: "GST",
    shippingCost: 0,
    freeShippingThreshold: 0,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("cart");
      if (stored) setItems(JSON.parse(stored));
    } catch (e) {
      console.error("[CartProvider] Failed to load cart:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist cart whenever it changes (after hydration)
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem("cart", JSON.stringify(items));
    } catch (e) {
      console.error("[CartProvider] Failed to save cart:", e);
    }
  }, [items, isHydrated]);

  // Fetch tax + shipping settings once
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
      .catch((e) => console.error("[CartProvider] Failed to load settings:", e));
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id && !i.isBundle);
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id && !i.isBundle
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i,
        );
      }
      return [...prev, newItem];
    });
  }, []);

  /**
   * addBundle — adds a bundle as a SINGLE cart line item.
   *
   * The key difference from addItem:
   *   - Sets isBundle = true
   *   - Stores bundleProducts[] with real productId strings (MongoDB ObjectIds)
   *   - Sets gst = 0 so per-item tax is skipped (bundle is pre-priced)
   *
   * When the order is placed, the API sees isBundle=true and expands
   * bundleProducts into individual inventory deductions.
   */
  const addBundle = useCallback((bundle: BundleCartInput) => {
    // Guard: ensure every product has a valid productId
    for (const p of bundle.products) {
      if (!p.productId || p.productId.trim() === "") {
        console.error(
          "[CartProvider] addBundle: product missing productId",
          bundle.name,
          p,
        );
        return; // abort — don't add broken bundle
      }
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.isBundle && i.bundleId === bundle.bundleId);
      if (existing) {
        // Increment quantity of existing bundle entry
        return prev.map((i) =>
          i.isBundle && i.bundleId === bundle.bundleId
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }

      const newItem: CartItem = {
        id: bundle.bundleId,
        bundleId: bundle.bundleId,
        name: bundle.name,
        price: bundle.bundlePrice,          // discounted final price
        quantity: 1,
        image: bundle.image,
        isBundle: true,
        gst: 0,                             // excluded from per-item tax
        discount: Math.max(0, bundle.originalPrice - bundle.bundlePrice),
        // ✅ bundleProducts carries real productId strings for the order API
        bundleProducts: bundle.products.map((p) => ({
          productId: p.productId,
          name: p.name,
          quantity: p.quantity,
          price: p.retailPrice,
          image: p.image,
        })),
      };
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
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (typeof window !== "undefined") localStorage.removeItem("cart");
  }, []);

  // ── Computed values ────────────────────────────────────────────────────────

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Bundles have gst=0 so they're excluded from per-item tax calculation
  const taxAmount = tax.taxEnabled
    ? items.reduce((sum, i) => {
        const rate = i.gst != null ? i.gst : tax.taxRate;
        return sum + (i.price * i.quantity * rate) / 100;
      }, 0)
    : 0;

  const shippingCost =
    tax.freeShippingThreshold > 0 && subtotal >= tax.freeShippingThreshold
      ? 0
      : tax.shippingCost;

  const total = subtotal + taxAmount + shippingCost;

  const value: CartContextValue = {
    items,
    addItem,
    addBundle,
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