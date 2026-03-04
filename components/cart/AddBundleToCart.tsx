// FILE PATH: components/product/AddProductToCart.tsx
// ✅ FIXED: Proper product ID validation and cart item creation

"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { ShoppingCart, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Product {
  _id: string; // ✅ MongoDB ObjectId from database
  name: string;
  retailPrice: number;
  mainImage?: string;
  unitSize?: number;
  unitType?: string;
  stock?: number;
  gst?: number;
  discount?: number;
  discountType?: "percentage" | "fixed";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidMongoId(id: string): boolean {
  return /^[a-f0-9]{24}$/.test(id);
}

function getSalePrice(product: Product): number {
  if (!product.discount) return product.retailPrice ?? 0;
  return product.discountType === "percentage"
    ? product.retailPrice * (1 - product.discount / 100)
    : Math.max(0, product.retailPrice - product.discount);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddProductToCart({
  product,
  className,
  quantity: initialQuantity = 1,
}: {
  product: Product;
  className?: string;
  quantity?: number;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(Math.max(1, initialQuantity));

  const handleAdd = async () => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // ── Validate product data ──────────────────────────────────────────
      if (!product._id) {
        console.error("[AddProductToCart] Product missing _id:", product);
        setErrorMsg("Invalid product. Please refresh the page.");
        return;
      }

      // ✅ CRITICAL: Verify MongoDB ObjectId format
      if (!isValidMongoId(product._id)) {
        console.error("[AddProductToCart] Invalid product._id format:", {
          productId: product._id,
          product: product.name,
        });
        setErrorMsg(
          `Invalid product ID format: "${product._id}". Please refresh and try again.`
        );
        return;
      }

      if (!product.name || product.name.trim() === "") {
        setErrorMsg("Product name is missing.");
        return;
      }

      if (product.retailPrice == null || product.retailPrice < 0) {
        setErrorMsg("Product price is invalid.");
        return;
      }

      if (quantity < 1) {
        setErrorMsg("Quantity must be at least 1.");
        return;
      }

      // Check stock
      if (product.stock != null && product.stock < quantity) {
        setErrorMsg(
          `Not enough stock. Available: ${product.stock}, Requested: ${quantity}`
        );
        return;
      }

      // ── Calculate sale price ───────────────────────────────────────────
      const salePrice = getSalePrice(product);

      // ── Build cart item ───────────────────────────────────────────────
      const cartItem = {
        id: product._id, // ✅ Use MongoDB ObjectId
        name: product.name,
        price: salePrice,
        quantity,
        image: product.mainImage || undefined,
        weight: product.unitType
          ? `${product.unitSize} ${product.unitType}`
          : undefined,
        discount: product.discount || 0,
        gst: product.gst || 17,
      };

      console.log("[AddProductToCart] Adding to cart:", {
        productId: product._id,
        productName: product.name,
        salePrice,
        quantity,
        cartItem,
      });

      // ── Add to cart ────────────────────────────────────────────────────
      addItem(cartItem);

      setAdded(true);
      setErrorMsg(null);
      setQuantity(initialQuantity);

      // Reset "added" state after 2 seconds
      setTimeout(() => setAdded(false), 2200);
    } catch (err) {
      console.error("[AddProductToCart] Unexpected error:", err);
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Quantity Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          disabled={quantity === 1 || isLoading}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          −
        </button>
        <input
          type="number"
          min="1"
          max={product.stock || 999}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          disabled={isLoading}
          className="w-12 text-center border rounded-lg px-2 py-1 text-sm font-semibold"
        />
        <button
          onClick={() =>
            setQuantity(
              Math.min(product.stock || 999, quantity + 1)
            )
          }
          disabled={
            (product.stock != null && quantity >= product.stock) ||
            isLoading
          }
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {/* Stock Status */}
      {product.stock != null && (
        <p
          className={`text-xs font-medium ${
            product.stock <= 0
              ? "text-red-500"
              : product.stock <= 10
              ? "text-orange-500"
              : "text-green-600"
          }`}
        >
          {product.stock <= 0
            ? "Out of stock"
            : `${product.stock} in stock`}
        </p>
      )}

      {/* Add to Cart Button */}
      <Button
        onClick={handleAdd}
        disabled={isLoading || added || (product.stock != null && product.stock <= 0)}
        className={`w-full bg-green-700 hover:bg-green-800 gap-2 transition-all disabled:opacity-60 ${className ?? ""}`}
      >
        {added ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Added to Cart!
          </>
        ) : isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            {product.stock != null && product.stock <= 0
              ? "Out of Stock"
              : "Add to Cart"}
          </>
        )}
      </Button>

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}