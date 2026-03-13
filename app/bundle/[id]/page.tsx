// app/bundles/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Package,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight,
  Tag,
  Zap,
} from "lucide-react";
import { getBundleSalePrice, getBundleRetailTotal, SaleBundle } from "@/components/store/BundleCard";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BundleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bundleId = params?.id as string;
  const { addBundle } = useCart();

  const [bundle, setBundle] = useState<SaleBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!bundleId) return;
    const fetchBundle = async () => {
      try {
        const res = await fetch(`/api/bundles/${bundleId}`);
        const data = await res.json();
        if (res.ok && data.bundle) {
          setBundle(data.bundle);
          setSelectedImage(
            data.bundle.image ||
            data.bundle.products[0]?.product?.mainImage ||
            "/placeholder.svg"
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBundle();
  }, [bundleId]);

  if (isLoading || !bundle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
        <p className="text-lg text-gray-500 font-medium">Loading bundle...</p>
      </div>
    );
  }

  const salePrice = getBundleSalePrice(bundle);
  const retailTotal = getBundleRetailTotal(bundle);
  const savings = retailTotal - salePrice;
  const savingsPct = retailTotal > 0 ? Math.round((savings / retailTotal) * 100) : 0;

  // Collect all product images for a gallery strip
  const allImages = [
    bundle.image,
    ...bundle.products.map((bp) => bp.product?.mainImage),
  ].filter(Boolean) as string[];

  const bundleCartPayload = {
    bundleId: bundle._id,
    name: bundle.name,
    bundlePrice: salePrice,
    originalPrice: retailTotal,
    discount: bundle.discount || 0,
    image: selectedImage || "/placeholder.svg",
    products: bundle.products.map((bp) => ({
      productId: bp.product._id,
      name: bp.product.name,
      quantity: bp.quantity,
      retailPrice: bp.product.retailPrice,
      image: bp.product.mainImage,
    })),
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    setTimeout(() => {
      addBundle(bundleCartPayload);
      setShowNotification(true);
      setIsAdding(false);
      setTimeout(() => setShowNotification(false), 2500);
    }, 400);
  };

  const handleBuyNow = () => {
    addBundle(bundleCartPayload);
    router.push("/cart");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col font-sans">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
          <button onClick={() => router.push("/")} className="hover:text-green-600 transition-colors font-medium">
            Home
          </button>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <button onClick={() => router.push("/sale")} className="hover:text-green-600 transition-colors font-medium">
            Flash Sale
          </button>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-gray-800 font-semibold truncate max-w-[200px]">{bundle.name}</span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">

        {/* ── MAIN BUNDLE CARD ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr] gap-0">

            {/* ─── LEFT: Image Gallery ─── */}
            <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
              {/* Main Image */}
              <div className="relative bg-gray-50 rounded-xl overflow-hidden aspect-square mb-4 group">
                {savingsPct > 0 && (
                  <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow">
                    -{savingsPct}%
                  </div>
                )}
                <div className="absolute top-4 right-4 z-10">
                  <span className="inline-flex items-center gap-1.5 bg-green-700 text-white font-black text-xs px-3 py-1.5 rounded-full shadow">
                    <Package className="h-3 w-3" /> Bundle
                  </span>
                </div>
                <Image
                  src={selectedImage || "/placeholder.svg"}
                  alt={bundle.name}
                  fill
                  className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              </div>

              {/* Thumbnail Strip — product images */}
              {allImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className={`flex-shrink-0 h-20 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === img
                          ? "border-green-600 shadow-md"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <div className="relative h-full w-full">
                        <Image src={img} alt={`View ${i + 1}`} fill className="object-contain p-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ─── RIGHT: Bundle Info ─── */}
            <div className="p-6 lg:p-8 flex flex-col">

              {/* Badge */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-bold px-3 py-1.5 rounded-full">
                  <Package className="h-4 w-4" /> Bundle Deal
                </span>
                {bundle.isFlashSale && (
                  <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-full">
                    <Zap className="h-4 w-4" /> Flash Sale
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl xl:text-4xl font-extrabold text-gray-900 leading-snug mb-3">
                {bundle.name}
              </h1>

              {/* Description */}
              {bundle.description && (
                <p className="text-base text-gray-500 mb-5 leading-relaxed flex items-start gap-2">
                  <Tag className="h-4 w-4 mt-0.5 shrink-0" />
                  {bundle.description}
                </p>
              )}

              {/* ── Price Block ── */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 mb-6 border border-green-100">
                <div className="flex flex-wrap items-baseline gap-3 mb-2">
                  <span className="text-4xl xl:text-5xl font-black text-green-700 tracking-tight">
                    Rs. {salePrice.toLocaleString()}
                  </span>
                  {retailTotal > salePrice && (
                    <span className="text-2xl text-gray-400 line-through font-semibold">
                      Rs. {retailTotal.toLocaleString()}
                    </span>
                  )}
                </div>
                {savings > 0 && (
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-base text-green-700 font-bold bg-green-100 px-3 py-1 rounded-full">
                      You save Rs. {savings.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400">* Includes all taxes</span>
                  </div>
                )}
              </div>

              {/* ── Pricing Breakdown ── */}
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pricing Breakdown</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Retail Total</span>
                    <span className="font-semibold">Rs. {retailTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Bundle Price</span>
                    <span className="font-semibold">Rs. {bundle.bundlePrice.toLocaleString()}</span>
                  </div>
                  {bundle.discount > 0 && (
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>Extra Discount</span>
                      <span>
                        {bundle.discountType === "percentage"
                          ? `−${bundle.discount}%`
                          : `−Rs. ${bundle.discount.toLocaleString()}`}
                      </span>
                    </div>
                  )}
                  {savings > 0 && (
                    <div className="flex justify-between font-bold text-green-700 border-t border-gray-200 pt-2 mt-1">
                      <span>Total Savings</span>
                      <span>Rs. {savings.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="flex-1 h-14 bg-white hover:bg-green-50 text-green-700 border-2 border-green-600 rounded-xl text-lg font-extrabold shadow-sm transition-all active:scale-95 flex items-center justify-center disabled:opacity-60"
                >
                  {isAdding ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Add to Cart"
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 h-14 bg-green-700 hover:bg-green-800 text-white rounded-xl text-lg font-extrabold shadow-md transition-all active:scale-95 flex items-center justify-center"
                >
                  Buy Now
                </button>
              </div>

              {/* Success Toast */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  showNotification ? "max-h-14 opacity-100 mb-4" : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex items-center gap-2 text-green-700 font-semibold text-base bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  Bundle added to cart!
                </div>
              </div>

              {/* ── Trust Badges ── */}
              <div className="grid grid-cols-3 gap-3 mt-auto pt-4 border-t border-gray-100">
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">Fast Delivery</span>
                  <span className="text-xs text-gray-400">2–5 days</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">Secure Pay</span>
                  <span className="text-xs text-gray-400">100% safe</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <RotateCcw className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">Easy Return</span>
                  <span className="text-xs text-gray-400">7-day policy</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── INCLUDED PRODUCTS ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 md:px-10 py-5 border-b border-gray-200 flex items-center gap-3">
            <Package className="h-5 w-5 text-green-700" />
            <h2 className="text-xl font-extrabold text-gray-900">
              What&apos;s in this bundle
            </h2>
            <span className="ml-auto text-sm font-semibold text-gray-400">
              {bundle.products.length} item{bundle.products.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="p-6 md:p-10">
            <div className="divide-y divide-gray-100">
              {bundle.products.map((bp, i) => (
                <div key={i} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 group/row hover:bg-gray-50 -mx-4 px-4 rounded-xl transition-colors">
                  {/* Image */}
                  <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                    <Image
                      src={bp.product?.mainImage || "/placeholder.svg"}
                      alt={bp.product?.name || ""}
                      fill
                      className="object-cover group-hover/row:scale-105 transition-transform duration-300"
                    />
                    {bp.quantity > 1 && (
                      <div className="absolute bottom-1 right-1 bg-green-700 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full border border-white">
                        ×{bp.quantity}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                      {bp.product?.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {bp.product?.unitSize} {bp.product?.unitType}
                      {bp.quantity > 1 && (
                        <span className="ml-2 text-green-700 font-semibold">× {bp.quantity} units</span>
                      )}
                    </p>
                  </div>

                  {/* Per-item price */}
                  <div className="text-right shrink-0">
                    <p className="text-sm md:text-base font-bold text-gray-900">
                      Rs. {((bp.product?.retailPrice || 0) * bp.quantity).toLocaleString()}
                    </p>
                    {bp.quantity > 1 && (
                      <p className="text-xs text-gray-400">
                        Rs. {(bp.product?.retailPrice || 0).toLocaleString()} each
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Row */}
            <div className="mt-6 pt-5 border-t-2 border-dashed border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">
                  Retail value: <span className="line-through font-semibold">Rs. {retailTotal.toLocaleString()}</span>
                </p>
                {savings > 0 && (
                  <p className="text-sm font-bold text-green-700">
                    You save Rs. {savings.toLocaleString()} ({savingsPct}% off)
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Bundle Price</p>
                <p className="text-2xl font-black text-green-700">
                  Rs. {salePrice.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6">
          <Link
            href="/sale"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Flash Sale
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}