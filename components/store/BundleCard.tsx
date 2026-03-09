// components/store/BundleCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { Package, Check, ShoppingCart, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BundleProduct {
  _id: string;
  name: string;
  retailPrice: number;
  mainImage?: string;
  unitSize: number;
  unitType: string;
}

export interface BundleProductEntry {
  product: BundleProduct;
  quantity: number;
}

export interface SaleBundle {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  products: BundleProductEntry[];
  bundlePrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  isActive: boolean;
  isFlashSale: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getBundleSalePrice(b: SaleBundle): number {
  if (!b.discount) return b.bundlePrice;
  return b.discountType === "percentage"
    ? b.bundlePrice * (1 - b.discount / 100)
    : Math.max(0, b.bundlePrice - b.discount);
}

export function getBundleRetailTotal(b: SaleBundle): number {
  return b.products.reduce(
    (sum, bp) => sum + (bp.product?.retailPrice || 0) * bp.quantity,
    0
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface BundleCardProps {
  bundle: SaleBundle;
  index?: number;
}

export default function BundleCard({ bundle, index = 0 }: BundleCardProps) {
  const router = useRouter();
  const { addBundle } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const salePrice = getBundleSalePrice(bundle);
  const retailTotal = getBundleRetailTotal(bundle);
  const savings = retailTotal - salePrice;
  const savingsPct =
    retailTotal > 0 ? Math.round((savings / retailTotal) * 100) : 0;

  const bundleCartPayload = {
    bundleId: bundle._id,
    name: bundle.name,
    bundlePrice: salePrice,
    originalPrice: retailTotal,
    discount: bundle.discount || 0,
    image:
      bundle.image ||
      bundle.products[0]?.product?.mainImage ||
      "/placeholder.svg",
    products: bundle.products.map((bp) => ({
      productId: bp.product._id,
      name: bp.product.name,
      quantity: bp.quantity,
      retailPrice: bp.product.retailPrice,
      image: bp.product.mainImage,
    })),
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addBundle(bundleCartPayload);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addBundle(bundleCartPayload);
    router.push("/cart");
  };

  return (
    <div
      className="group relative bg-white rounded-xl overflow-hidden border-2 border-green-100 hover:border-green-300 hover:shadow-xl transition-all duration-300 w-full"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-green-50 to-transparent border-b border-green-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: name + description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-green-700 text-white font-black text-xs uppercase tracking-widest px-3 py-1.5 rounded-full">
                <Package className="h-3 w-3" /> Bundle
              </span>
              {savingsPct > 0 && (
                <span className="inline-flex items-center bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-full">
                  {savingsPct}% OFF
                </span>
              )}
            </div>
            <h3 className="font-bold text-lg md:text-2xl text-gray-900 mb-1 leading-tight">
              {bundle.name}
            </h3>
            {bundle.description && (
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                {bundle.description}
              </p>
            )}
          </div>

          {/* Right: price (desktop) */}
          <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-700">
                Rs. {salePrice.toLocaleString()}
              </span>
              {retailTotal > salePrice && (
                <span className="text-base text-gray-400 line-through">
                  Rs. {retailTotal.toLocaleString()}
                </span>
              )}
            </div>
            {savings > 0 && (
              <p className="text-xs text-gray-500 font-medium">
                Save Rs. {savings.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── PRODUCTS GRID ──────────────────────────────────────────────── */}
      <div className="p-4 md:p-6 border-b border-green-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
          📦 Includes {bundle.products.length} item
          {bundle.products.length !== 1 ? "s" : ""}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {bundle.products.map((bp, i) => (
            <div
              key={i}
              className="group/item flex flex-col text-center bg-gray-50 rounded-xl p-3 md:p-4 hover:bg-white hover:shadow-md hover:border-green-200 transition-all duration-300 border border-transparent"
            >
              {/* Image */}
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white border border-gray-100 mb-3 group-hover/item:border-green-300 transition-colors">
                <Image
                  src={bp.product?.mainImage || "/placeholder.svg"}
                  alt={bp.product?.name || ""}
                  fill
                  className="object-cover object-center group-hover/item:scale-110 transition-transform duration-300"
                  sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 20vw"
                />
                {bp.quantity > 1 && (
                  <div className="absolute bottom-2 right-2 bg-green-700 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow border-2 border-white">
                    ×{bp.quantity}
                  </div>
                )}
              </div>

              {/* Info */}
              <h4 className="font-semibold text-xs md:text-sm text-gray-900 line-clamp-2 mb-1 leading-tight">
                {bp.product?.name}
              </h4>
              <p className="text-[10px] md:text-xs text-gray-500 mb-2">
                {bp.product?.unitSize} {bp.product?.unitType}
              </p>

              {/* Price */}
              <div className="mt-auto pt-2 border-t border-gray-100">
                <p className="text-xs md:text-sm font-bold text-green-700">
                  Rs.{" "}
                  {(
                    (bp.product?.retailPrice || 0) * bp.quantity
                  ).toLocaleString()}
                </p>
                {bp.quantity > 1 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Rs. {(bp.product?.retailPrice || 0).toLocaleString()} each
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBILE FOOTER ──────────────────────────────────────────────── */}
      <div className="md:hidden px-4 py-4 bg-green-50 space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-green-700">
            Rs. {salePrice.toLocaleString()}
          </span>
          {retailTotal > salePrice && (
            <span className="text-xs text-gray-400 line-through">
              Rs. {retailTotal.toLocaleString()}
            </span>
          )}
        </div>
        {savings > 0 && (
          <p className="text-xs text-gray-600">
            You save Rs. {savings.toLocaleString()}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleAddToCart}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
              showSuccess
                ? "bg-green-100 border-green-200 text-green-700"
                : "bg-white border-gray-200 text-gray-900 hover:border-gray-900"
            }`}
          >
            {showSuccess ? (
              <>
                <Check className="w-3 h-3" /> Added
              </>
            ) : (
              <>
                <ShoppingCart className="w-3 h-3" /> Add
              </>
            )}
          </button>
          <button
            onClick={handleBuyNow}
            className="flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors shadow-sm"
          >
            Buy <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── DESKTOP FOOTER ─────────────────────────────────────────────── */}
      <div className="hidden md:flex px-6 py-4 bg-green-50 items-center justify-between gap-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" /> Hide Breakdown
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> Pricing Breakdown
            </>
          )}
        </button>

        <div className="flex gap-3 ml-auto">
          <button
            onClick={handleAddToCart}
            className={`flex items-center gap-2 py-2.5 px-6 rounded-lg text-sm font-bold border transition-all ${
              showSuccess
                ? "bg-green-100 border-green-200 text-green-700"
                : "bg-white border-gray-200 text-gray-900 hover:border-gray-900"
            }`}
          >
            {showSuccess ? (
              <>
                <Check className="w-4 h-4" /> Added
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </>
            )}
          </button>
          <button
            onClick={handleBuyNow}
            className="flex items-center gap-2 py-2.5 px-6 rounded-lg text-sm font-bold text-white bg-green-700 hover:bg-green-800 transition-colors shadow-md"
          >
            Buy Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── PRICING BREAKDOWN (expandable) ─────────────────────────────── */}
      {expanded && (
        <div className="hidden md:block px-6 py-4 bg-white border-t border-gray-100 text-sm">
          <div className="space-y-2.5 max-w-sm">
            <div className="flex justify-between text-gray-700">
              <span>Retail Total</span>
              <span className="font-semibold">
                Rs. {retailTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Bundle Price</span>
              <span className="font-semibold">
                Rs. {bundle.bundlePrice.toLocaleString()}
              </span>
            </div>
            {bundle.discount > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Discount</span>
                <span>
                  {bundle.discountType === "percentage"
                    ? `−${bundle.discount}%`
                    : `−Rs. ${bundle.discount}`}
                </span>
              </div>
            )}
            {savings > 0 && (
              <div className="flex justify-between font-bold text-green-700 border-t pt-2.5 mt-1">
                <span>You Save</span>
                <span>Rs. {savings.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}