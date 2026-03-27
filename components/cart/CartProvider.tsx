'use client';

// FILE PATH: components/cart/CartProvider.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** One FIFO batch as returned by /api/products */
export interface FIFOBatch {
  _id:               string;
  remainingQuantity: number;
  sellingPrice:      number;
  buyingRate:        number;
}

/**
 * A cart line is keyed by `cartKey`.
 *
 * • Regular products:  cartKey = `${id}__${price}`
 *   When a product spans two FIFO batches with different prices the cart
 *   creates two separate lines — one per batch price.
 *
 * • Bundles:           cartKey = `${bundleId}__bundle`
 *   Bundles are pre-priced and bypass FIFO entirely.
 */
export interface CartItem {
  /** Unique line key — use this for removeItem / updateQuantity */
  cartKey:  string;
  id:       string;   // product _id  (or bundleId for bundles)
  name:     string;
  price:    number;
  quantity: number;
  weight?:  string;
  image?:   string;
  discount?: number;
  gst?:     number;
  /** Available stock — used to enforce ceiling in the UI */
  stock?:   number;

  // ── Bundle-specific ──────────────────────────────────────────────────────
  isBundle?:           boolean;
  bundleId?:           string;
  bundleName?:         string;
  bundleDiscount?:     number;
  bundleOriginalPrice?: number;
  bundleProducts?: {
    productId:   string;
    name:        string;
    quantity:    number;
    retailPrice: number;
    image?:      string;
  }[];
}

export interface BundleCartInput {
  bundleId:      string;
  name:          string;
  bundlePrice:   number;
  originalPrice: number;
  discount?:     number;
  image?:        string;
  products: {
    productId:   string;
    name:        string;
    quantity:    number;
    retailPrice: number;
    image?:      string;
  }[];
}

/**
 * Payload for addItem().
 * Pass `fifoBatches` (from /api/products) to enable real-time batch pricing.
 * If omitted the item is added at `price` as before — fully backward-compatible.
 */
export interface AddItemPayload {
  id:       string;
  name:     string;
  price:    number;   // base / discounted price (fallback when no fifoBatches)
  quantity?: number;
  weight?:  string;
  image?:   string;
  discount?: number;
  gst?:     number;
  stock?:   number;
  /** Full FIFO batch queue for this product (oldest first) */
  fifoBatches?: FIFOBatch[];
}

interface TaxSettings {
  taxEnabled:            boolean;
  taxRate:               number;
  taxName:               string;
  shippingCost:          number;
  freeShippingThreshold: number;
}

interface CartContextType {
  items:          CartItem[];
  /** Add a regular product (with optional FIFO batch support) */
  addItem:        (payload: AddItemPayload) => void;
  /** Add a bundle (bypasses FIFO) */
  addBundle:      (bundle: BundleCartInput) => void;
  /** Remove a line by cartKey */
  removeItem:     (cartKey: string) => void;
  /** Update quantity of a line by cartKey */
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart:      () => void;
  subtotal:       number;
  taxAmount:      number;
  taxRate:        number;
  taxName:        string;
  taxEnabled:     boolean;
  shippingCost:   number;
  total:          number;
  gstAmount:      number;
}

// ─── FIFO helper ──────────────────────────────────────────────────────────────

/**
 * Return the sellingPrice for the unit at position `unitIndex` (0-based)
 * by walking the FIFO batch queue oldest-first.
 *
 * Example: batches = [{remaining:2, price:100}, {remaining:3, price:120}]
 *   index 0 → 100   (batch-1, unit-1)
 *   index 1 → 100   (batch-1, unit-2)
 *   index 2 → 120   (batch-2, unit-1)
 */
function getPriceAtIndex(batches: FIFOBatch[], unitIndex: number): number {
  let skip = unitIndex;
  for (const b of batches) {
    if (skip < b.remainingQuantity) return b.sellingPrice;
    skip -= b.remainingQuantity;
  }
  // Fallback to last known batch price
  return batches[batches.length - 1]?.sellingPrice ?? 0;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'khas_cart_v2'; // v2 = cartKey-based format

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items,       setItems]       = useState<CartItem[]>([]);
  const [isHydrated,  setIsHydrated]  = useState(false);
  const [tax,         setTax]         = useState<TaxSettings>({
    taxEnabled:            true,
    taxRate:               17,
    taxName:               'GST',
    shippingCost:          0,
    freeShippingThreshold: 0,
  });

  // ── Hydration ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch (e) {
      console.error('[CartProvider] Failed to load cart:', e);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // ── Persistence ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[CartProvider] Failed to save cart:', e);
    }
  }, [items, isHydrated]);

  // ── Fetch store settings ───────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings;
        if (!s) return;
        setTax({
          taxEnabled:            s.taxEnabled            ?? true,
          taxRate:               s.taxRate               ?? 17,
          taxName:               s.taxName               || 'GST',
          shippingCost:          s.shippingCost          ?? 0,
          freeShippingThreshold: s.freeShippingThreshold ?? 0,
        });
      })
      .catch((e) => console.error('[CartProvider] Failed to load settings:', e));
  }, []);

  // ── addItem (with FIFO batch support) ─────────────────────────────────────

  const addItem = useCallback((payload: AddItemPayload) => {
    setItems((prev) => {
      const unitsToAdd   = payload.quantity ?? 1;
      const fifoBatches  = payload.fifoBatches;

      // ── Without FIFO batches: original single-price behaviour ─────────────
      if (!fifoBatches || fifoBatches.length === 0) {
        const cartKey = `${payload.id}__${payload.price}`;

        // Stock guard
        const inCart = prev
          .filter((i) => i.id === payload.id && !i.isBundle)
          .reduce((s, i) => s + i.quantity, 0);
        if (payload.stock !== undefined && inCart >= payload.stock) return prev;

        const existing = prev.find((i) => i.cartKey === cartKey);
        if (existing) {
          return prev.map((i) =>
            i.cartKey === cartKey
              ? { ...i, quantity: i.quantity + unitsToAdd }
              : i
          );
        }
        return [
          ...prev,
          {
            cartKey,
            id:       payload.id,
            name:     payload.name,
            price:    payload.price,
            quantity: unitsToAdd,
            weight:   payload.weight,
            image:    payload.image,
            discount: payload.discount,
            gst:      payload.gst,
            stock:    payload.stock,
          },
        ];
      }

      // ── With FIFO batches: split across batch price boundaries ────────────
      // Add units one at a time; for each unit look up its correct batch price
      // and increment (or create) the matching cart line.
      let nextState = [...prev];

      for (let u = 0; u < unitsToAdd; u++) {
        const totalInCart = nextState
          .filter((i) => i.id === payload.id && !i.isBundle)
          .reduce((s, i) => s + i.quantity, 0);

        // Per-unit stock guard
        if (payload.stock !== undefined && totalInCart >= payload.stock) break;

        const unitPrice = getPriceAtIndex(fifoBatches, totalInCart);
        const cartKey   = `${payload.id}__${unitPrice}`;

        const existingIdx = nextState.findIndex((i) => i.cartKey === cartKey);
        if (existingIdx >= 0) {
          nextState = nextState.map((i, idx) =>
            idx === existingIdx ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          nextState = [
            ...nextState,
            {
              cartKey,
              id:       payload.id,
              name:     payload.name,
              price:    unitPrice,
              quantity: 1,
              weight:   payload.weight,
              image:    payload.image,
              discount: payload.discount,
              gst:      payload.gst,
              stock:    payload.stock,
            },
          ];
        }
      }

      return nextState;
    });
  }, []);

  // ── addBundle (unchanged — bundles bypass FIFO) ───────────────────────────

  const addBundle = useCallback((bundle: BundleCartInput) => {
    if (!bundle.bundleId) {
      console.error('[CartProvider] Bundle missing ID');
      return;
    }
    for (const p of bundle.products || []) {
      if (!p.productId || typeof p.productId !== 'string' || !p.productId.trim()) {
        console.error('[CartProvider] Bundle product missing productId:', p);
        return;
      }
    }

    const cartKey = `${bundle.bundleId}__bundle`;

    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartKey,
          id:                  bundle.bundleId,
          bundleId:            bundle.bundleId,
          name:                bundle.name,
          price:               bundle.bundlePrice,
          quantity:            1,
          image:               bundle.image,
          isBundle:            true,
          bundleDiscount:      bundle.discount || 0,
          bundleOriginalPrice: bundle.originalPrice,
          bundleProducts:      bundle.products.map((p) => ({
            productId:   p.productId,
            name:        p.name,
            quantity:    p.quantity,
            retailPrice: p.retailPrice,
            image:       p.image,
          })),
        },
      ];
    });
  }, []);

  // ── removeItem / updateQuantity (now use cartKey) ─────────────────────────

  const removeItem = useCallback((cartKey: string) => {
    setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
  }, []);

  const updateQuantity = useCallback(
    (cartKey: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
        return;
      }
      setItems((prev) =>
        prev.map((item) => {
          if (item.cartKey !== cartKey) return item;
          // Respect stock ceiling
          const capped =
            item.stock !== undefined
              ? Math.min(quantity, item.stock)
              : quantity;
          return { ...item, quantity: capped };
        })
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ── Computed totals ────────────────────────────────────────────────────────

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Bundles use gst=0; regular items fall back to store taxRate
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

  const value: CartContextType = {
    items,
    addItem,
    addBundle,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    taxAmount,
    taxRate:    tax.taxRate,
    taxName:    tax.taxName,
    taxEnabled: tax.taxEnabled,
    shippingCost,
    total,
    gstAmount:  taxAmount,
  };

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}