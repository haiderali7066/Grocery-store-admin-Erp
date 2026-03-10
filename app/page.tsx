// app/page.tsx (Home)
"use client";

import { useEffect, useState } from "react";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/store/Navbar";
import { HeroCarousel } from "@/components/store/HeroCarousel";
import { FeaturedProducts } from "@/components/store/FeaturedProducts";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import BundleCard, { SaleBundle } from "@/components/store/BundleCard";
import {
  ArrowRight, Zap, Gift,
  Sparkles, ChevronRight, Check, ShoppingCart,
  Heart,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  _id: string;
  name: string;
  isVisible: boolean;
  sortOrder: number;
  icon?: string;
}

interface HomeProduct {
  _id: string;
  name: string;
  retailPrice: number;
  discount: number;
  discountType: string;
  images?: string[];
  mainImage?: string;
  isHot?: boolean;
  isFlashSale?: boolean;
  isFeatured?: boolean;
  unitType: string;
  unitSize: number;
  stock: number;
  category?: { _id: string; name: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}

// ── Inline ProductCard ────────────────────────────────────────────────────────

function HomeProductCard({ product }: { product: HomeProduct }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!product.stock || product.stock <= 0) return null;

  const discountedPrice =
    product.discountType === "percentage"
      ? product.retailPrice * (1 - product.discount / 100)
      : product.retailPrice - product.discount;

  const imageUrl = product.mainImage || product.images?.[0] || "/placeholder.svg";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsAdding(true);
    addItem({ id: product._id, name: product.name, price: discountedPrice, quantity: 1, image: imageUrl, weight: `${product.unitSize} ${product.unitType}` });
    setShowSuccess(true);
    setTimeout(() => { setIsAdding(false); setShowSuccess(false); }, 1000);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    addItem({ id: product._id, name: product.name, price: discountedPrice, quantity: 1, image: imageUrl, weight: `${product.unitSize} ${product.unitType}` });
    router.push("/cart");
  };

  return (
    <Link href={`/products/${product._id}`} className="group h-full block">
      <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 relative">
        <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
          <Image src={imageUrl} alt={product.name} fill unoptimized
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {product.discount > 0 && (
              <span className="bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm">
                -{product.discountType === "percentage" ? `${product.discount}%` : `Rs.${product.discount}`}
              </span>
            )}
            {(product.isHot || product.isFlashSale) && (
              <span className="bg-amber-400 text-black text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm">HOT</span>
            )}
          </div>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsFavorite(!isFavorite); }}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-red-500 transition-colors shadow-sm"
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </div>
        <div className="flex flex-col flex-grow p-3 sm:p-4">
          <div className="flex-grow">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">{product.unitSize} {product.unitType}</p>
            <h3 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 mb-2 group-hover:text-green-700 transition-colors">{product.name}</h3>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-base sm:text-lg font-bold text-gray-900">Rs. {discountedPrice.toLocaleString()}</span>
              {product.discount > 0 && <span className="text-xs sm:text-sm text-gray-400 line-through">Rs. {product.retailPrice.toLocaleString()}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button onClick={handleAddToCart} disabled={isAdding}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 border ${showSuccess ? "bg-green-100 border-green-200 text-green-700" : "bg-white border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50"}`}
            >
              {showSuccess ? <><Check className="w-3 h-3 sm:w-4 sm:h-4" /> Added</> : <><ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" /> Add</>}
            </button>
            <button onClick={handleBuyNow} className="flex items-center justify-center py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors shadow-sm">
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [bundles, setBundles] = useState<SaleBundle[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(true);

  const [allProducts, setAllProducts] = useState<HomeProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 10;

  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.categories)) setCategories(data.categories); else throw new Error(); })
      .catch(() => setCategoriesError("Failed to fetch categories"))
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    fetch("/api/sale/bundles")
      .then(r => r.json())
      .then(data => setBundles(data.bundles ?? []))
      .catch(() => setBundles([]))
      .finally(() => setLoadingBundles(false));
  }, []);

  useEffect(() => {
    fetch("/api/products?limit=100")
      .then(r => r.json())
      .then(data => {
        const products = Array.isArray(data.products) ? data.products : Array.isArray(data) ? data : [];
        setAllProducts(products);
      })
      .catch(() => setProductsError("Failed to fetch products"))
      .finally(() => setLoadingProducts(false));
  }, []);

  const displayedProducts = allProducts.slice(0, productPage * PRODUCTS_PER_PAGE);
  const hasMore = displayedProducts.length < allProducts.length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Nunito:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', Georgia, serif; }
        body { font-family: 'Nunito', system-ui, sans-serif; }

        .section-pill {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 5px 14px; border-radius: 100px; margin-bottom: 12px;
        }
        .section-pill-green { background: #DCFCE7; color: #15803D; }
        .section-pill-orange { background: #FFEDD5; color: #C2410C; }

        .skeleton-box {
          animation: skeleton 1.4s ease-in-out infinite;
          background: linear-gradient(90deg, #F0FDF4 25%, #DCFCE7 50%, #F0FDF4 75%);
          background-size: 200% 100%;
        }
        @keyframes skeleton { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .load-more-btn { transition: all 0.2s ease; }
        .load-more-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -6px rgba(22,163,74,0.3); }
      `}</style>

      <Navbar />

      <main className="flex-1">

        {/* ── Hero ── */}
        <section><HeroCarousel /></section>

        {/* ── Featured Products ── */}
        <FeaturedProducts />

        {/* ── Bundle Deals ── */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Section header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-10">
              <div>
                <span className="section-pill section-pill-orange">
                  <Gift className="w-3 h-3" /> Bundle Deals
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                  Hot Bundle Deals
                </h2>
                <p className="text-gray-500 text-base mt-2">
                  Save more when you buy together
                </p>
              </div>
              <Link
                href="/sale"
                className="inline-flex items-center gap-1.5 text-green-700 font-semibold text-sm hover:text-orange-600 transition-colors group"
              >
                View all deals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Bundles — full-width stacked, same as sale page */}
            {loadingBundles ? (
              <div className="space-y-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-2xl skeleton-box" style={{ height: 420 }} />
                ))}
              </div>
            ) : bundles.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-base">No bundle deals available right now.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {bundles.map((bundle, i) => (
                  <BundleCard key={bundle._id} bundle={bundle} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── All Products ── */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-10">
            <div>
              <span className="section-pill section-pill-green"><Sparkles className="w-3 h-3" /> All Products</span>
              <h2 className="font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-gray-900 leading-tight">
                Everything We Offer
              </h2>
              <p className="text-gray-500 text-base mt-2">
                {allProducts.length > 0 ? `${allProducts.length} products and counting` : "Fresh products added daily"}
              </p>
            </div>
            <Link href="/products" className="inline-flex items-center gap-1.5 text-green-700 font-semibold text-sm hover:text-orange-600 transition-colors group">
              View full catalogue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                  <div className="aspect-square skeleton-box" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 skeleton-box rounded" />
                    <div className="h-3 skeleton-box rounded w-2/3" />
                    <div className="h-8 skeleton-box rounded mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : productsError ? (
            <div className="text-center py-16">
              <p className="text-red-500 font-semibold">{productsError}</p>
              <p className="text-gray-400 text-sm mt-1">Please try refreshing the page</p>
            </div>
          ) : allProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No products available yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                {displayedProducts.map((product) => (
                  <HomeProductCard key={product._id} product={product} />
                ))}
              </div>
              {hasMore && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => setProductPage(p => p + 1)}
                    className="load-more-btn inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3.5 rounded-xl transition-colors"
                  >
                    Load More Products <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-gray-400 text-sm mt-3">
                    Showing {displayedProducts.length} of {allProducts.length} products
                  </p>
                </div>
              )}
            </>
          )}
        </section>

      </main>

      <Footer />
    </div>
  );
}