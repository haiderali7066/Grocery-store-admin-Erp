"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Minus,
  ArrowLeft,
  Zap,
  Flame,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
  category: any;
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
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (productId) fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}`);

      // Safety Check: If response is HTML (the <!DOCTYPE error source)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server returned non-JSON response. Check API route path.",
        );
      }

      const data = await res.json();

      if (res.ok) {
        setProduct(data.product);
      } else {
        setError(data.message || "Failed to load product");
      }
    } catch (err: any) {
      console.error("[Product Detail] Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-green-700" />
        <p className="mt-4 text-gray-500 font-medium tracking-tight">
          Loading product details...
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Product Not Found
        </h2>
        <p className="text-gray-600 mb-6 max-w-md">
          {error || "This item is no longer available."}
        </p>
        <Button
          onClick={() => router.push("/products")}
          className="bg-green-700 hover:bg-green-800 rounded-full px-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
        </Button>
      </div>
    );
  }

  // Calculations
  const discountAmount =
    product.discountType === "percentage"
      ? (product.retailPrice * product.discount) / 100
      : product.discount;

  const priceAfterDiscount = Math.max(0, product.retailPrice - discountAmount);
  const gstAmount = priceAfterDiscount * 0.17;
  const finalTotalPrice = priceAfterDiscount + gstAmount;

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem({
      id: product._id,
      name: product.name,
      price: finalTotalPrice,
      quantity,
      weight: `${product.unitSize} ${product.unitType}`,
      image: product.mainImage || product.images?.[0] || "/placeholder.svg",
    });

    setShowNotification(true);
    setIsAdding(false);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-green-700 font-medium transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to browsing
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 bg-white p-4 sm:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
          {/* Image Section - Using aspect-square to avoid portrait stretching */}
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 group">
            <Image
              src={
                product.mainImage || product.images?.[0] || "/placeholder.svg"
              }
              alt={product.name}
              fill
              className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
              priority
            />
          </div>

          {/* Details Section */}
          <div className="flex flex-col py-2">
            <div className="flex gap-2 mb-6">
              {product.isFlashSale && (
                <span className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Zap className="h-3 w-3 fill-current" /> Flash Sale
                </span>
              )}
              {product.isHot && (
                <span className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Flame className="h-3 w-3 fill-current" /> Hot Item
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mb-3 tracking-tight">
              {product.name}
            </h1>

            <p className="text-xl text-gray-500 mb-8 font-medium">
              {product.unitSize} {product.unitType} •{" "}
              <span className="text-green-600">
                {product.category?.name || product.category}
              </span>
            </p>

            {product.description && (
              <div className="mb-10">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">
                  Product Description
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {product.description}
                </p>
              </div>
            )}

            {/* Pricing Card */}
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 mb-10">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-5xl font-black text-green-700">
                  Rs. {finalTotalPrice.toFixed(0)}
                </span>
                {product.discount > 0 && (
                  <span className="text-2xl text-gray-300 line-through decoration-red-400 decoration-2">
                    Rs. {product.retailPrice}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 font-semibold mb-4">
                Price inclusive of 17% GST (Rs. {gstAmount.toFixed(0)})
              </p>

              {product.discount > 0 && (
                <div className="inline-flex items-center bg-red-50 text-red-600 text-sm font-bold px-4 py-2 rounded-xl border border-red-100">
                  Save{" "}
                  {product.discountType === "percentage"
                    ? `${product.discount}%`
                    : `Rs. ${product.discount}`}{" "}
                  on this item
                </div>
              )}
            </div>

            {/* Buying Actions */}
            <div className="mt-auto space-y-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Minus className="h-5 w-5 text-gray-600" />
                  </button>
                  <span className="w-10 text-center font-black text-xl text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Plus className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                <div
                  className={`px-4 py-2 rounded-full text-sm font-bold ${product.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  {product.stock > 0
                    ? `${product.stock} units available`
                    : "Out of Stock"}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || isAdding}
                  className="w-full h-16 bg-green-700 hover:bg-green-800 text-white rounded-2xl text-xl font-bold shadow-xl shadow-green-100 transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {isAdding ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Add to Cart"
                  )}
                </Button>

                {showNotification && (
                  <div className="flex items-center justify-center gap-3 text-green-800 bg-green-100 py-4 rounded-2xl border border-green-200 animate-in fade-in zoom-in-95 duration-300">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <span className="font-bold">
                      Successfully added to cart!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ProductDetailContent;
