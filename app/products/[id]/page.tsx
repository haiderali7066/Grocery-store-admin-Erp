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

  useEffect(() => {
    if (productId) fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (res.ok) setProduct(data.product);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-700" />
      </div>
    );
  }

  // Price Calculations
  const discountAmount =
    product.discountType === "percentage"
      ? (product.retailPrice * product.discount) / 100
      : product.discount;

  const priceAfterDiscount = Math.max(0, product.retailPrice - discountAmount);
  const finalTotalPrice = priceAfterDiscount * 1.17; // Assuming 17% tax/markup

  const addProductToCart = () => {
    addItem({
      id: product._id,
      name: product.name,
      price: finalTotalPrice,
      quantity,
      weight: `${product.unitSize} ${product.unitType}`,
      image: product.mainImage || product.images?.[0] || "/placeholder.svg",
    });
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    
    // Simulating a brief async action for button visual feedback
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 md:py-12">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-green-700 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* LEFT SIDE: Image & Description */}
          <div className="space-y-6">
            {/* Product Image */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center justify-center relative overflow-hidden group">
              {product.discount > 0 && (
                <div className="absolute top-6 left-6 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  -{product.discountType === "percentage" ? `${product.discount}%` : `Rs.${product.discount}`}
                </div>
              )}
              <div className="relative aspect-square w-full max-w-md">
                <Image
                  src={
                    product.mainImage ||
                    product.images?.[0] ||
                    "/placeholder.svg"
                  }
                  alt={product.name}
                  fill
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-4">
                  Product Description
                </h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Details & Actions */}
          <div className="flex flex-col justify-start order-first lg:order-none">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {product.isHot && (
                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Flame className="h-3.5 w-3.5" /> Hot Item
                </span>
              )}
              {product.isFlashSale && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Zap className="h-3.5 w-3.5" /> Flash Sale
                </span>
              )}
            </div>

            {/* Title & Size */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
              {product.name}
            </h1>
            <p className="text-gray-500 font-medium mb-8">
              Unit: {product.unitSize} {product.unitType}
            </p>

            {/* Pricing Section */}
            <div className="mb-8 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-extrabold text-green-700">
                  Rs. {finalTotalPrice.toFixed(0)}
                </span>
                {product.discount > 0 && (
                  <span className="text-xl text-gray-400 line-through font-medium">
                    Rs. {(product.retailPrice * 1.17).toFixed(0)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">* Includes applicable taxes</p>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                  product.stock > 0
                    ? "text-green-600 bg-green-50 px-3 py-1 rounded-full"
                    : "text-red-600 bg-red-50 px-3 py-1 rounded-full"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${product.stock > 0 ? "bg-green-600" : "bg-red-600"}`}></span>
                {product.stock > 0 ? `${product.stock} In Stock` : "Out of Stock"}
              </span>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 mb-8">
              <span className="text-gray-700 font-medium">Quantity</span>
              <div className="flex items-center border border-gray-200 bg-white rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-semibold text-gray-900">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={quantity >= product.stock}
                  className="p-3 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || isAdding}
                className="flex-1 h-14 bg-green-700 hover:bg-green-800 text-white rounded-xl text-base font-semibold shadow-sm transition-all"
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
                className="flex-1 h-14 bg-gray-900 hover:bg-black text-white rounded-xl text-base font-semibold shadow-sm transition-all"
              >
                Buy Now
              </Button>
            </div>

            {/* Success Notification */}
            <div className={`mt-4 overflow-hidden transition-all duration-300 ${showNotification ? "max-h-12 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="flex items-center gap-2 text-green-700 font-medium bg-green-50 p-3 rounded-lg border border-green-100">
                <CheckCircle2 className="h-5 w-5" />
                Successfully added to cart!
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10">
          <ProductReviews productId={product._id} productName={product.name} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ProductDetailContent;