"use client";

// FILE PATH: components/cart/AddBundleToCart.tsx
//
// Usage on any bundle card:
//   <AddBundleToCart bundle={bundle} />
//
// Works with bundles fetched from EITHER:
//   - /api/admin/sale/bundles  → products[].product is a populated object
//   - /api/sale/bundles        → same populated shape
//
// Bundle product shape from API (after .populate):
//   bundle.products = [
//     { product: { _id: "abc123", name: "...", retailPrice: 200, mainImage: "..." }, quantity: 2 },
//     ...
//   ]

import { useState } from "react";
import { useCart, BundleCartInput } from "@/components/cart/CartProvider";
import { ShoppingCart, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

// The populated product object shape returned by the API
interface PopulatedProduct {
  _id: string;
  name: string;
  retailPrice: number;
  mainImage?: string;
  unitSize?: number;
  unitType?: string;
}

// Each entry in bundle.products after population
interface BundleProductEntry {
  product: PopulatedProduct;
  quantity: number;
}

// The full bundle object as returned by the API
export interface BundleForCart {
  _id: string;
  name: string;
  image?: string;
  products: BundleProductEntry[];
  bundlePrice: number;      // base price set at creation
  discount: number;
  discountType: "percentage" | "fixed";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFinalPrice(b: BundleForCart): number {
  if (!b.discount) return b.bundlePrice;
  return b.discountType === "percentage"
    ? b.bundlePrice * (1 - b.discount / 100)
    : Math.max(0, b.bundlePrice - b.discount);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddBundleToCart({
  bundle,
  className,
}: {
  bundle: BundleForCart;
  className?: string;
}) {
  const { addBundle } = useCart();
  const [added, setAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = () => {
    setErrorMsg(null);

    // ── Validate bundle data before touching cart ──────────────────────────
    if (!bundle._id) {
      setErrorMsg("Invalid bundle — missing ID.");
      return;
    }

    if (!bundle.products?.length) {
      setErrorMsg("Bundle has no products.");
      return;
    }

    for (const bp of bundle.products) {
      // bp.product must be a populated object (not null/string/undefined)
      if (
        !bp.product ||
        typeof bp.product !== "object" ||
        !bp.product._id
      ) {
        console.error(
          `[AddBundleToCart] Bundle "${bundle.name}" — product entry has no _id:`,
          bp
        );
        setErrorMsg(
          "This bundle has incomplete product data. Please refresh the page and try again."
        );
        return;
      }
    }

    // ── Build BundleCartInput ─────────────────────────────────────────────
    const finalPrice = getFinalPrice(bundle);

    const retailTotal = bundle.products.reduce(
      (sum, bp) => sum + (bp.product.retailPrice || 0) * bp.quantity,
      0
    );

    const input: BundleCartInput = {
      bundleId: bundle._id,
      name: bundle.name,
      bundlePrice: finalPrice,      // what customer actually pays
      originalPrice: retailTotal,   // retail total before bundle discount
      image: bundle.image || bundle.products[0]?.product.mainImage,
      products: bundle.products.map((bp) => ({
        productId: bp.product._id,          // ✅ real MongoDB ObjectId
        name: bp.product.name,
        quantity: bp.quantity,
        retailPrice: bp.product.retailPrice || 0,
        image: bp.product.mainImage,
      })),
    };

    // Debug log — verify productIds look like ObjectIds before cart add
    console.log(
      "[AddBundleToCart] Adding bundle:",
      bundle.name,
      "| finalPrice:", finalPrice,
      "| products:", input.products.map((p) => `${p.name}(${p.productId})`)
    );

    addBundle(input);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className="w-full space-y-1.5">
      <Button
        onClick={handleAdd}
        className={`w-full bg-green-700 hover:bg-green-800 gap-2 transition-all ${className ?? ""}`}
      >
        {added ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Added to Cart!
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            Add Bundle to Cart
          </>
        )}
      </Button>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}