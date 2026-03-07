"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import { ProductReviews } from "@/components/store/ProductReviews";
import {
  Plus,
  Minus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Flame,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Star,
  ChevronRight,
  Heart,
  Share2,
  Tag,
} from "lucide-react";

interface Product {
  _id: string;
  name: string;
  retailPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  unitSize: number;
  unitType: string;
  stock: number;
  gst: number;   // ADD THIS
  category?: string | Record<string, unknown>;
  mainImage?: string;
  images?: string[];
  description?: string;
  isFlashSale: boolean;
  isHot: boolean;
  isFeatured: boolean;
}

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (productId) fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (res.ok) {
        setProduct(data.product);
        setSelectedImage(data.product.mainImage || data.product.images?.[0] || "/placeholder.svg");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        <p className="text-lg text-gray-500 font-medium">Loading product...</p>
      </div>
    );
  }

  const discountAmount =
    product.discountType === "percentage"
      ? (product.retailPrice * product.discount) / 100
      : product.discount;

  const priceAfterDiscount = Math.max(0, product.retailPrice - discountAmount);
const gstMultiplier = 1 + (product.gst || 0) / 100;

const finalPrice = priceAfterDiscount;
const originalPrice = product.retailPrice;
  const savings = originalPrice - finalPrice;

  const allImages = [
    product.mainImage,
    ...(product.images || []),
  ].filter(Boolean) as string[];

  const addProductToCart = () => {
    addItem({
      id: product._id,
      name: product.name,
      price: finalPrice,
      quantity,
      weight: `${product.unitSize} ${product.unitType}`,
      image: selectedImage || product.mainImage || "/placeholder.svg",
    });
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    setTimeout(() => {
      addProductToCart();
      setShowNotification(true);
      setIsAdding(false);
      setTimeout(() => setShowNotification(false), 2500);
    }, 400);
  };

  const handleBuyNow = () => {
    addProductToCart();
    router.push("/cart");
  };

  const categoryName =
    typeof product.category === "string"
      ? product.category
      : (product.category as Record<string, unknown>)?.name as string || "Products";

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col font-sans">
      <Navbar />

      {/* Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
          <button onClick={() => router.push("/")} className="hover:text-orange-500 transition-colors font-medium">
            Home
          </button>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <button onClick={() => router.push("/products")} className="hover:text-orange-500 transition-colors font-medium">
            {categoryName}
          </button>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-gray-800 font-semibold truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">

        {/* MAIN PRODUCT CARD */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr] gap-0">

            {/* ─── LEFT: Image Gallery ─── */}
            <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
              {/* Main Image */}
              <div className="relative bg-gray-50 rounded-xl overflow-hidden aspect-square mb-4 group">
                {product.discount > 0 && (
                  <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow">
                    {product.discountType === "percentage"
                      ? `-${product.discount}%`
                      : `-Rs.${product.discount}`}
                  </div>
                )}
                {/* Wishlist & Share */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <button
                    onClick={() => setIsWishlisted((w) => !w)}
                    className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                  >
                    <Heart
                      className={`h-5 w-5 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                    />
                  </button>
                  <button className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Share2 className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                <Image
                  src={selectedImage || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              </div>

              {/* Thumbnail Strip */}
              {allImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className={`flex-shrink-0 h-20 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === img
                          ? "border-orange-500 shadow-md"
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

            {/* ─── RIGHT: Product Info ─── */}
            <div className="p-6 lg:p-8 flex flex-col">

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2 mb-4">
                {product.isHot && (
                  <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 text-sm font-bold px-3 py-1.5 rounded-full">
                    <Flame className="h-4 w-4" /> Hot Item
                  </span>
                )}
                {product.isFlashSale && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1.5 rounded-full">
                    <Zap className="h-4 w-4" /> Flash Sale
                  </span>
                )}
                {product.isFeatured && (
                  <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 text-sm font-bold px-3 py-1.5 rounded-full">
                    <Star className="h-4 w-4 fill-current" /> Featured
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h1 className="text-2xl md:text-3xl xl:text-4xl font-extrabold text-gray-900 leading-snug mb-3">
                {product.name}
              </h1>

              {/* Unit Size */}
              <p className="text-lg text-gray-500 font-medium mb-6 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {product.unitSize} {product.unitType}
              </p>

              {/* ── Price Block ── */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 mb-6 border border-orange-100">
                <div className="flex flex-wrap items-baseline gap-3 mb-2">
                  <span className="text-4xl xl:text-5xl font-black text-orange-600 tracking-tight">
                    Rs. {finalPrice.toFixed(0)}
                  </span>
                  {product.discount > 0 && (
                    <span className="text-2xl text-gray-400 line-through font-semibold">
                      Rs. {originalPrice.toFixed(0)}
                    </span>
                  )}
                </div>
                {product.discount > 0 && (
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-base text-green-700 font-bold bg-green-100 px-3 py-1 rounded-full">
                      You save Rs. {savings.toFixed(0)}
                    </span>
                    <span className="text-sm text-gray-400">* Includes all taxes</span>
                  </div>
                )}
                {product.discount === 0 && (
                  <p className="text-sm text-gray-400">* Includes all applicable taxes</p>
                )}
              </div>

              {/* ── Stock Status ── */}
              <div className="mb-6">
                {product.stock > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-base font-bold text-green-700">In Stock</span>
                    <span className="text-base text-gray-500">— {product.stock} units available</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500"></span>
                    <span className="text-base font-bold text-red-600">Out of Stock</span>
                  </div>
                )}
              </div>

              {/* ── Quantity ── */}
              <div className="flex items-center gap-5 mb-8">
                <span className="text-lg font-bold text-gray-800">Quantity</span>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-4 py-3 hover:bg-gray-100 text-gray-700 transition-colors disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="w-14 text-center text-xl font-black text-gray-900 select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={quantity >= product.stock}
                    className="px-4 py-3 hover:bg-gray-100 text-gray-700 transition-colors disabled:opacity-40"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <span className="text-base text-gray-400 font-medium">
                  Total:{" "}
                  <span className="text-gray-700 font-bold">
                    Rs. {(finalPrice * quantity).toFixed(0)}
                  </span>
                </span>
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || isAdding}
                  className="flex-1 h-14 bg-white hover:bg-orange-50 text-orange-600 border-2 border-orange-500 rounded-xl text-lg font-extrabold shadow-sm transition-all active:scale-95"
                >
                  {isAdding ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Add to Cart"
                  )}
                </Button>
                <Button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-lg font-extrabold shadow-md transition-all active:scale-95"
                >
                  Buy Now
                </Button>
              </div>

              {/* Success Toast */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  showNotification ? "max-h-14 opacity-100 mb-4" : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex items-center gap-2 text-green-700 font-semibold text-base bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  Added to cart successfully!
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

        {/* ─── TABBED SECTION: Description + Reviews ─── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Tab Nav */}
          <div className="flex border-b border-gray-200">
            {(["description", "reviews"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-8 py-5 text-base font-bold capitalize transition-all border-b-3 ${
                  activeTab === tab
                    ? "border-b-[3px] border-orange-500 text-orange-600 bg-orange-50"
                    : "border-b-[3px] border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {tab === "description" ? "Product Details" : "Ratings & Reviews"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-10">
            {activeTab === "description" ? (
              <div>
                {product.description ? (
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900 mb-4">About this product</h3>
                    <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-lg text-gray-400 italic">No description available for this product.</p>
                )}

                {/* Specs Table */}
                <div className="mt-10">
                  <h3 className="text-xl font-extrabold text-gray-900 mb-5">Specifications</h3>
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    {[
                      { label: "Product Name", value: product.name },
                      { label: "Unit Size", value: `${product.unitSize} ${product.unitType}` },
                      { label: "Stock Available", value: `${product.stock} units` },
                      {
                        label: "Category",
                        value:
                          typeof product.category === "string"
                            ? product.category
                            : (product.category as Record<string, unknown>)?.name as string || "—",
                      },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className={`flex ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                      >
                        <div className="w-44 sm:w-56 flex-shrink-0 px-5 py-4 text-base font-bold text-gray-600 border-r border-gray-200">
                          {row.label}
                        </div>
                        <div className="flex-1 px-5 py-4 text-base text-gray-800">
                          {row.value || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ProductReviews productId={product._id} productName={product.name} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ProductDetailContent;