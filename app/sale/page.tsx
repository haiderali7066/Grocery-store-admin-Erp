"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import {
  Zap,
  Clock,
  ShoppingCart,
  Flame,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SaleConfig {
  isActive: boolean;
  title: string;
  subtitle: string;
  badgeText: string;
  endsAt: string;
}

interface SaleProduct {
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

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(endsAt: string | null) {
  const calc = useCallback(() => {
    if (!endsAt) return { d: 0, h: 0, m: 0, s: 0, expired: true };
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  }, [endsAt]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  return time;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSalePrice(p: SaleProduct): number {
  if (!p.discount) return p.retailPrice;
  return p.discountType === "percentage"
    ? p.retailPrice * (1 - p.discount / 100)
    : Math.max(0, p.retailPrice - p.discount);
}

function getDiscountLabel(p: SaleProduct): string {
  if (!p.discount) return "";
  return p.discountType === "percentage"
    ? `${p.discount}% OFF`
    : `Rs.${p.discount} OFF`;
}

// ── CountUnit ─────────────────────────────────────────────────────────────────

function CountUnit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[72px] h-[72px] md:w-24 md:h-24 lg:w-28 lg:h-28">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-white rounded-t-xl flex items-end justify-center overflow-hidden shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
          <span
            className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-none mb-px"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {display}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gray-100 rounded-b-xl flex items-start justify-center overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          <span
            className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-700 leading-none mt-px"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {display}
          </span>
        </div>
        <div className="absolute inset-x-0 top-1/2 -translate-y-px h-0.5 bg-gray-900/20 z-10" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-yellow-400 rounded-b-xl z-10" />
      </div>
      <span className="text-[10px] md:text-xs font-black text-yellow-300 uppercase tracking-[0.2em]">
        {label}
      </span>
    </div>
  );
}
// ── FlashCard (Updated to match reference) ───────────────────────────────────

function FlashCard({
  product,
  index,
}: {
  product: SaleProduct;
  index: number;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const salePrice = getSalePrice(product);
  const label = getDiscountLabel(product);
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 15;
  const stockPct = Math.min((product.stock / 15) * 100, 100);

  const imageUrl = product.mainImage || "/placeholder.svg";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);

    addItem({
      id: product._id,
      name: product.name,
      price: salePrice,
      quantity: 1,
      image: imageUrl,
      weight: `${product.unitSize} ${product.unitType}`,
    });

    setShowSuccess(true);
    setTimeout(() => {
      setIsAdding(false);
      setShowSuccess(false);
    }, 1000);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      id: product._id,
      name: product.name,
      price: salePrice,
      quantity: 1,
      image: imageUrl,
      weight: `${product.unitSize} ${product.unitType}`,
    });
    router.push("/cart");
  };

  return (
    <div
      className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 flex flex-col h-full"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* 1. IMAGE SECTION - Fixed to square covering the box */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, 33vw"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {label && (
            <span className="bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm">
              {label}
            </span>
          )}
          <span className="bg-amber-400 text-black text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <Zap className="h-2 w-2 fill-black" /> FLASH
          </span>
        </div>

        {outOfStock && (
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-gray-900 text-white text-[10px] font-black px-4 py-2 rounded-full tracking-widest uppercase">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* 2. CONTENT SECTION */}
      <div className="flex flex-col flex-grow p-3 sm:p-4">
        <div className="flex-grow">
          <p className="text-[10px] sm:text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">
            {product.unitSize} {product.unitType}
          </p>

          <h3 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 mb-2 group-hover:text-green-700 transition-colors">
            {product.name}
          </h3>

          {lowStock && !outOfStock && (
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold text-orange-600 uppercase">
                  🔥 Low Stock
                </span>
                <span className="text-[10px] font-bold text-gray-500">
                  {product.stock} left
                </span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${stockPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-lg sm:text-xl font-bold text-green-700">
              Rs. {salePrice.toLocaleString()}
            </span>
            {product.discount > 0 && (
              <span className="text-xs text-gray-400 line-through">
                Rs. {product.retailPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* 3. BUTTON SECTION */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button
            onClick={handleAddToCart}
            disabled={isAdding || outOfStock}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 border
              ${
                showSuccess
                  ? "bg-green-100 border-green-200 text-green-700"
                  : "bg-white border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50"
              } disabled:opacity-50`}
          >
            {showSuccess ? (
              <>
                <Check className="w-3 h-3 sm:w-4 sm:h-4" /> Added
              </>
            ) : (
              <>
                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" /> Add
              </>
            )}
          </button>

          <button
            onClick={handleBuyNow}
            disabled={outOfStock}
            className="flex items-center justify-center py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors shadow-sm disabled:bg-gray-200 disabled:text-gray-400"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SalePage() {
  const [config, setConfig] = useState<SaleConfig | null>(null);
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const countdown = useCountdown(config?.endsAt ?? null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sale").then((r) => r.json()),
      fetch("/api/sale/products").then((r) => r.json()),
    ])
      .then(([saleData, prodData]) => {
        setConfig(saleData.sale ?? null);
        setProducts(prodData.products ?? []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const saleActive = config?.isActive && !countdown.expired;

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#14532d]">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #facc15 0, #facc15 1px, transparent 0, transparent 50%)",
            backgroundSize: "14px 14px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(21,128,61,0.8) 0%, transparent 70%)",
          }}
        />
        <div className="relative h-2 w-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-14 pb-0 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 font-black text-xs uppercase tracking-[0.2em] px-5 py-2 rounded-full shadow-lg mb-7">
            <Flame className="h-3.5 w-3.5" />
            {isLoading ? "Flash Sale" : config?.badgeText || "Flash Sale"}
          </div>

          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] mb-5 tracking-tight"
            style={{
              fontFamily: "'Georgia', serif",
              textShadow: "0 4px 32px rgba(0,0,0,0.4)",
            }}
          >
            {isLoading ? (
              <span className="animate-pulse">Flash Sale</span>
            ) : (
              config?.title || "Flash Sale"
            )}
          </h1>

          <p className="text-green-200 text-base md:text-lg font-medium mb-10 max-w-lg mx-auto leading-relaxed">
            {isLoading
              ? "Loading…"
              : config?.subtitle || "Unbeatable deals — limited time only"}
          </p>

          {!isLoading && (
            <div className="mb-0">
              {!config?.isActive ? (
                <div className="inline-flex items-center gap-2.5 bg-white/10 border border-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-2xl mb-6">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <span className="font-semibold text-sm">
                    No active sale right now
                  </span>
                </div>
              ) : countdown.expired ? (
                <div className="inline-flex items-center gap-2.5 bg-white/10 border border-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-2xl mb-6">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <span className="font-semibold text-sm">Sale has ended</span>
                </div>
              ) : (
                <div className="mb-2">
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />
                    <span className="text-yellow-300 text-xs font-black uppercase tracking-[0.25em]">
                      Ends In
                    </span>
                  </div>
                  <div className="flex items-start justify-center gap-3 md:gap-5">
                    <CountUnit value={countdown.d} label="Days" />
                    <span className="text-yellow-400 text-2xl md:text-4xl font-black pt-3 md:pt-5">
                      :
                    </span>
                    <CountUnit value={countdown.h} label="Hours" />
                    <span className="text-yellow-400 text-2xl md:text-4xl font-black pt-3 md:pt-5">
                      :
                    </span>
                    <CountUnit value={countdown.m} label="Mins" />
                    <span className="text-yellow-400 text-2xl md:text-4xl font-black pt-3 md:pt-5">
                      :
                    </span>
                    <CountUnit value={countdown.s} label="Secs" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative h-16 md:h-24 mt-8">
          <svg
            viewBox="0 0 1440 96"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0,96 L1440,0 L1440,96 Z" fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* Products */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-20 -mt-2">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2 bg-yellow-400 text-gray-900 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-full shadow-sm">
            <Zap className="h-3.5 w-3.5 fill-gray-900" /> Flash Deals
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-yellow-300/60 to-transparent" />
          {!isLoading && (
            <span className="text-xs font-semibold text-gray-400">
              {products.length} deal{products.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-gray-200 animate-pulse"
                style={{ height: 320, animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div className="text-center py-28">
            <div className="w-20 h-20 bg-green-50 border-2 border-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Zap className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">
              {saleActive ? "No Flash Sale Products Yet" : "No Active Sale"}
            </h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              {saleActive
                ? "The admin hasn't tagged any products for this sale yet."
                : "Check back soon for our next flash sale event!"}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-bold px-8 py-3 rounded-xl transition-colors text-sm"
            >
              Browse All Products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {products.map((p, i) => (
                <FlashCard key={p._id} product={p} index={i} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 border-2 border-green-700 text-green-700 hover:bg-green-700 hover:text-white font-bold px-8 py-3 rounded-xl transition-all text-sm"
              >
                Browse All Products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
