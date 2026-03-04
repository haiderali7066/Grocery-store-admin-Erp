"use client";

// FILE PATH: components/store/ProductCard.tsx

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Heart, Check, AlertCircle, Layers } from "lucide-react";
import { useCart, FIFOBatch } from "@/components/cart/CartProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  _id:          string;
  name:         string;
  retailPrice:  number;
  discount:     number;
  discountType: string;
  images?:      string[];
  mainImage?:   string;
  isHot:        boolean;
  isFlashSale:  boolean;
  isFeatured:   boolean;
  isNewArrival?: boolean;
  unitType:     string;
  unitSize:     number;
  stock:        number;
  /** FIFO batch queue returned by /api/products — oldest first */
  fifoBatches?: FIFOBatch[];
}

interface ProductCardProps {
  product: Product;
}

// ─── FIFO helper ──────────────────────────────────────────────────────────────

/**
 * Return the selling price for the unit at position `unitIndex` (0-based)
 * by walking the FIFO batch queue.
 */
function getPriceAtIndex(batches: FIFOBatch[], unitIndex: number): number {
  let skip = unitIndex;
  for (const b of batches) {
    if (skip < b.remainingQuantity) return b.sellingPrice;
    skip -= b.remainingQuantity;
  }
  return batches[batches.length - 1]?.sellingPrice ?? 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addItem, items } = useCart();
  const [isFavorite,    setIsFavorite]    = useState(false);
  const [isAdding,      setIsAdding]      = useState(false);
  const [showSuccess,   setShowSuccess]   = useState(false);
  const [showStockWarn, setShowStockWarn] = useState(false);

  // Hide if out of stock
  if (!product.stock || product.stock <= 0) return null;

  // ── Price ──────────────────────────────────────────────────────────────────
  // `retailPrice` from the API is already the current FIFO batch price.
  // We apply the product-level discount on top (bundles / sale events).
  const basePrice =
    product.discountType === "percentage"
      ? product.retailPrice * (1 - product.discount / 100)
      : product.retailPrice - product.discount;

  const imageUrl = product.mainImage || product.images?.[0] || "/placeholder.svg";

  // ── Cart state for this product ────────────────────────────────────────────
  const inCartQty = items
    .filter((i) => i.id === product._id && !i.isBundle)
    .reduce((s, i) => s + i.quantity, 0);

  const isMaxedOut = inCartQty >= product.stock;

  // ── Live next-unit price (FIFO) ────────────────────────────────────────────
  // When the cart already holds units from batch-1 and batch-1 is exhausted,
  // the next unit added should show batch-2's price — in real time.
  const fifoBatches = product.fifoBatches ?? [];
  const nextUnitPrice =
    fifoBatches.length > 0
      ? getPriceAtIndex(fifoBatches, inCartQty)
      : basePrice;

  // Is the user currently at a batch boundary?
  // i.e. the price of the next unit differs from the first unit's price
  const firstUnitPrice = fifoBatches.length > 0
    ? getPriceAtIndex(fifoBatches, 0)
    : basePrice;
  const isCrossingBatch =
    fifoBatches.length > 1 && nextUnitPrice !== firstUnitPrice;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const doAdd = () => {
    addItem({
      id:          product._id,
      name:        product.name,
      price:       basePrice,   // fallback if no batches
      quantity:    1,
      image:       imageUrl,
      weight:      `${product.unitSize} ${product.unitType}`,
      discount:    product.discount,
      gst:         0,
      stock:       product.stock,
      fifoBatches: fifoBatches.length > 0 ? fifoBatches : undefined,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isMaxedOut) {
      setShowStockWarn(true);
      setTimeout(() => setShowStockWarn(false), 1500);
      return;
    }

    setIsAdding(true);
    doAdd();
    setShowSuccess(true);
    setTimeout(() => {
      setIsAdding(false);
      setShowSuccess(false);
    }, 1000);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isMaxedOut) {
      setShowStockWarn(true);
      setTimeout(() => setShowStockWarn(false), 1500);
      return;
    }

    doAdd();
    router.push("/cart");
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite((f) => !f);
  };

  return (
    <Link href={`/products/${product._id}`} className="group h-full block">
      <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 relative">

        {/* ── Image ── */}
        <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />

          {/* Top-left badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {product.discount > 0 && (
              <span className="bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm">
                -{product.discountType === "percentage"
                  ? `${product.discount}%`
                  : `Rs.${product.discount}`}
              </span>
            )}
            {(product.isHot || product.isFlashSale) && (
              <span className="bg-amber-400 text-black text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm">
                HOT
              </span>
            )}
            {/* Multi-batch badge */}
            {fifoBatches.length > 1 && (
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Layers className="h-2.5 w-2.5" />
                {fifoBatches.length} batches
              </span>
            )}
          </div>

          {/* Bottom-left: cart & stock status */}
          {inCartQty > 0 && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${
                isMaxedOut
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}>
                {isMaxedOut
                  ? "Max in cart"
                  : `${inCartQty} in cart · ${product.stock - inCartQty} left`}
              </span>
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-red-500 transition-colors shadow-sm"
          >
            <Heart
              className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
            />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex flex-col flex-grow p-3 sm:p-4">
          <div className="flex-grow">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">
              {product.unitSize} {product.unitType}
            </p>
            <h3 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 mb-2 group-hover:text-green-700 transition-colors">
              {product.name}
            </h3>

            {/* Price — live FIFO next-unit price */}
            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
              <span className={`text-base sm:text-lg font-bold ${
                isCrossingBatch ? "text-amber-600" : "text-gray-900"
              }`}>
                Rs. {nextUnitPrice.toLocaleString()}
              </span>
              {/* Show original price crossed out if batch crossed */}
              {isCrossingBatch && (
                <span className="text-xs text-gray-400 line-through">
                  Rs. {firstUnitPrice.toLocaleString()}
                </span>
              )}
              {/* Show discount strike-through when not crossing batch */}
              {!isCrossingBatch && product.discount > 0 && (
                <span className="text-xs sm:text-sm text-gray-400 line-through">
                  Rs. {product.retailPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Batch-crossing hint */}
            {isCrossingBatch && (
              <p className="text-[11px] text-amber-600 font-semibold mb-1 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Next units from new batch
              </p>
            )}

            {/* Low stock */}
            {product.stock <= 5 && (
              <p className="text-[11px] text-orange-600 font-semibold mb-2">
                Only {product.stock} left!
              </p>
            )}
          </div>

          {/* Stock warn toast */}
          {showStockWarn && (
            <div className="mb-2 flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Only {product.stock} in stock — already in cart!
            </div>
          )}

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button
              onClick={handleAddToCart}
              disabled={isAdding || isMaxedOut}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                isMaxedOut
                  ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                  : showSuccess
                  ? "bg-green-100 border-green-200 text-green-700"
                  : "bg-white border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50"
              }`}
            >
              {isMaxedOut ? (
                <><AlertCircle className="w-3 h-3" /> Max stock</>
              ) : showSuccess ? (
                <><Check className="w-3 h-3 sm:w-4 sm:h-4" /> Added</>
              ) : (
                <><ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" /> Add</>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isMaxedOut}
              className={`flex items-center justify-center py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-sm ${
                isMaxedOut
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "text-white bg-green-700 hover:bg-green-800"
              }`}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}