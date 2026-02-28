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
import {
  Package, ArrowRight, Star, Zap, Tag, Gift,
  Sparkles, ChevronRight, Check, ShoppingCart,
  Heart, ChevronDown, ChevronUp,
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

interface BundleProductEntry {
  product: HomeProduct;
  quantity: number;
}

interface HomeBundle {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  products: BundleProductEntry[];
  bundlePrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  isActive: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}

function getBundleSalePrice(b: HomeBundle): number {
  if (!b.discount) return b.bundlePrice;
  return b.discountType === "percentage"
    ? b.bundlePrice * (1 - b.discount / 100)
    : Math.max(0, b.bundlePrice - b.discount);
}

function getBundleRetailTotal(b: HomeBundle): number {
  return b.products.reduce((sum, bp) => sum + (bp.product?.retailPrice || 0) * bp.quantity, 0);
}

const CATEGORY_GRADIENTS = [
  "from-green-500 to-emerald-600", "from-orange-400 to-orange-500",
  "from-green-400 to-teal-500", "from-amber-400 to-orange-400",
  "from-emerald-500 to-green-600", "from-orange-500 to-amber-500",
  "from-teal-400 to-green-500", "from-lime-400 to-green-500",
];
const CATEGORY_ICON_BG = [
  "bg-green-50", "bg-orange-50", "bg-emerald-50", "bg-amber-50",
  "bg-teal-50", "bg-lime-50", "bg-green-50", "bg-orange-50",
];

// ── Inline ProductCard (identical to ProductCard.tsx) ─────────────────────────

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

// ── Inline BundleCard (identical to BundleCard in sale page) ──────────────────

function HomeBundleCard({ bundle, index }: { bundle: HomeBundle; index: number }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const salePrice = getBundleSalePrice(bundle);
  const retailTotal = getBundleRetailTotal(bundle);
  const savings = retailTotal - salePrice;
  const savingsPct = retailTotal > 0 ? Math.round((savings / retailTotal) * 100) : 0;

  const bundleImage = bundle.image || bundle.products[0]?.product?.mainImage || "/placeholder.svg";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    addItem({ id: bundle._id, name: bundle.name, price: salePrice, quantity: 1, image: bundleImage, weight: `${bundle.products.length} items` });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1000);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    addItem({ id: bundle._id, name: bundle.name, price: salePrice, quantity: 1, image: bundleImage, weight: `${bundle.products.length} items` });
    router.push("/cart");
  };

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden border-2 border-green-100 hover:border-green-300 hover:shadow-xl transition-all duration-300 flex flex-col h-full" style={{ animationDelay: `${index * 60}ms` }}>
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        <span className="bg-green-700 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm flex items-center gap-1">
          <Package className="h-2.5 w-2.5" /> BUNDLE
        </span>
        {savingsPct > 0 && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">{savingsPct}% OFF</span>}
      </div>

      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-green-50 to-transparent">
        <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">{bundle.name}</h3>
        {bundle.description && <p className="text-xs text-gray-500 line-clamp-1">{bundle.description}</p>}
      </div>

      {/* Items list */}
      <div className="flex-1 p-4 space-y-2">
        {bundle.products.map((bp, i) => (
          <div key={i} className="flex items-center gap-2.5 bg-gray-50 rounded-lg p-2.5 text-xs">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white border flex-shrink-0">
              <Image src={bp.product?.mainImage || "/placeholder.svg"} alt={bp.product?.name || ""} fill unoptimized className="object-contain p-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-[11px] truncate">{bp.product?.name}</p>
              <p className="text-gray-500 text-[10px]">{bp.product?.unitSize} {bp.product?.unitType}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-gray-400 text-[10px]">×{bp.quantity}</p>
              <p className="font-bold text-gray-700">Rs. {((bp.product?.retailPrice || 0) * bp.quantity).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Expandable pricing */}
      <div className="px-4 py-2 border-t">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-center w-full gap-1 text-xs text-gray-500 hover:text-gray-700 py-1">
          {expanded ? <><ChevronUp className="h-3 w-3" /> Hide Pricing</> : <><ChevronDown className="h-3 w-3" /> Show Pricing</>}
        </button>
        {expanded && (
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between text-gray-600"><span>Retail Total:</span><span>Rs. {retailTotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-gray-600"><span>Bundle Price:</span><span>Rs. {bundle.bundlePrice.toLocaleString()}</span></div>
            {bundle.discount > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Extra Discount:</span>
                <span>{bundle.discountType === "percentage" ? `-${bundle.discount}%` : `-Rs. ${bundle.discount}`}</span>
              </div>
            )}
            {savings > 0 && (
              <div className="flex justify-between font-bold text-green-700 border-t pt-1 mt-1">
                <span>You Save:</span><span>Rs. {savings.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Price + CTA */}
      <div className="px-4 py-3 bg-green-50 border-t border-green-100">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg sm:text-xl font-bold text-green-700">Rs. {salePrice.toLocaleString()}</span>
          {retailTotal > salePrice && <span className="text-xs text-gray-400 line-through">Rs. {retailTotal.toLocaleString()}</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleAddToCart}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 border ${showSuccess ? "bg-green-100 border-green-200 text-green-700" : "bg-white border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50"}`}
          >
            {showSuccess ? <><Check className="w-3 h-3 sm:w-4 sm:h-4" /> Added</> : <><ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" /> Add</>}
          </button>
          <button onClick={handleBuyNow} className="flex items-center justify-center py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors shadow-sm gap-1">
            Buy <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [bundles, setBundles] = useState<HomeBundle[]>([]);
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

        .category-card { transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; }
        .category-card:hover { transform: translateY(-8px) scale(1.04); box-shadow: 0 24px 48px -12px rgba(22,163,74,0.25); }

        .cta-card-products {
          background: linear-gradient(135deg, #15803D 0%, #16A34A 50%, #22C55E 100%);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .cta-card-products:hover { transform: translateY(-5px) scale(1.01); box-shadow: 0 30px 60px -15px rgba(22,163,74,0.45); }
        .cta-card-sale {
          background: linear-gradient(135deg, #C2410C 0%, #EA580C 50%, #F97316 100%);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .cta-card-sale:hover { transform: translateY(-5px) scale(1.01); box-shadow: 0 30px 60px -15px rgba(234,88,12,0.45); }
        .cta-blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); pointer-events: none; }

        .stats-strip {
          background: linear-gradient(90deg, #EA580C 0%, #F97316 50%, #EA580C 100%);
          background-size: 200% 100%;
          animation: shimmer-strip 4s ease infinite;
        }
        @keyframes shimmer-strip { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

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

        {/* ── Categories Section ── */}


        {/* ── Featured Products (amber marquee strip) ── */}
        <FeaturedProducts />

        {/* ── Bundle Deals ── */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-10">
              <div>
                <span className="section-pill section-pill-orange"><Gift className="w-3 h-3" /> Bundle Deals</span>
                <h2 className="font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-gray-900 leading-tight">Save More, Buy Together</h2>
                <p className="text-gray-500 text-base mt-2">Handpicked bundles at unbeatable prices</p>
              </div>
              <Link href="/sale" className="inline-flex items-center gap-1.5 text-orange-600 font-semibold text-sm hover:text-green-700 transition-colors group">
                See all bundles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {loadingBundles ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border-2 border-green-100">
                    <div className="h-14 skeleton-box" />
                    <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, j) => <div key={j} className="h-12 skeleton-box rounded-lg" />)}</div>
                    <div className="h-20 skeleton-box" />
                  </div>
                ))}
              </div>
            ) : bundles.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400">No bundle deals available right now — check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {bundles.slice(0, 6).map((bundle, i) => (
                  <HomeBundleCard key={bundle._id} bundle={bundle} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>
         

        {/* ── Dual CTA Cards ── */}
        {/* <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/products" className="cta-card-products block rounded-3xl p-8 md:p-10 relative overflow-hidden group">
              <div className="cta-blob w-48 h-48 -top-16 -right-16" />
              <div className="cta-blob w-32 h-32 -bottom-12 -left-8" />
              <div className="relative">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">Browse All Products</h3>
                <p className="text-green-100 text-base mb-6">Discover 500+ fresh, organic, and wholesome products from trusted brands.</p>
                <div className="inline-flex items-center gap-2 bg-white text-green-700 font-bold text-sm px-5 py-3 rounded-xl group-hover:bg-green-50 transition-colors">
                  Shop Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            <Link href="/sale" className="cta-card-sale block rounded-3xl p-8 md:p-10 relative overflow-hidden group">
              <div className="cta-blob w-48 h-48 -top-16 -right-16" />
              <div className="cta-blob w-32 h-32 -bottom-12 -left-8" />
              <div className="absolute top-6 right-6 w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-lg">
                <span className="font-display text-lg font-bold text-orange-600 leading-none">50%</span>
                <span className="text-orange-500 text-xs font-bold">OFF</span>
              </div>
              <div className="relative">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5">
                  <Tag className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">Today's Hot Deals</h3>
                <p className="text-orange-100 text-base mb-6">Limited-time offers on your favourite products. Don't miss out — sale ends soon!</p>
                <div className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold text-sm px-5 py-3 rounded-xl group-hover:bg-orange-50 transition-colors">
                  View Sale <Zap className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </section> */}

        {/* ── All Products ── */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-10">
            <div>
              <span className="section-pill section-pill-green"><Sparkles className="w-3 h-3" /> All Products</span>
              <h2 className="font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-gray-900 leading-tight">Everything We Offer</h2>
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
            <div className="text-center py-16"><p className="text-gray-400">No products available yet</p></div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                {displayedProducts.map((product) => (
                  <HomeProductCard key={product._id} product={product} />
                ))}
              </div>
              {hasMore && (
                <div className="text-center mt-10">
                  <button onClick={() => setProductPage(p => p + 1)}
                    className="load-more-btn inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3.5 rounded-xl transition-colors"
                  >
                    Load More Products <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-gray-400 text-sm mt-3">Showing {displayedProducts.length} of {allProducts.length} products</p>
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