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
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (productId) fetchProduct();
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
      </div>
    );
  }

  const discountAmount =
    product.discountType === "percentage"
      ? (product.retailPrice * product.discount) / 100
      : product.discount;

  const priceAfterDiscount = Math.max(0, product.retailPrice - discountAmount);
  const finalTotalPrice = priceAfterDiscount * 1.17;

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
    addProductToCart();
    setShowNotification(true);
    setIsAdding(false);
    setTimeout(() => setShowNotification(false), 2500);
  };

  const handleBuyNow = () => {
    addProductToCart();
    router.push("/cart");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-700 mb-10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* LEFT SIDE */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="relative aspect-square">
                <Image
                  src={
                    product.mainImage ||
                    product.images?.[0] ||
                    "/placeholder.svg"
                  }
                  alt={product.name}
                  fill
                  className="object-contain transition-transform duration-500 hover:scale-105"
                  priority
                />
              </div>
            </div>

            {/* Bigger + Bold Description */}
            {product.description && (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-4">
                  Description
                </h3>
                <p className="text-4xl font-bold text-gray-800 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex flex-col justify-start">

            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
              {product.name}
            </h1>

            <p className="text-gray-500 mb-8">
              {product.unitSize} {product.unitType}
            </p>

            {/* Price */}
            <div className="mb-8">
              <span className="text-4xl font-bold text-green-700">
                Rs. {finalTotalPrice.toFixed(0)}
              </span>
              {product.discount > 0 && (
                <span className="ml-4 text-lg text-gray-400 line-through">
                  Rs. {product.retailPrice}
                </span>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-6 mb-10">
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-4 py-2 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <span
                className={`text-sm font-medium ${
                  product.stock > 0
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            {/* Modern Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || isAdding}
                className="flex-1 h-12 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add to Cart"
                )}
              </Button>

              <Button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className="flex-1 h-12 bg-black hover:bg-gray-900 text-white rounded-xl text-sm font-semibold"
              >
                Buy Now
              </Button>
            </div>

            {showNotification && (
              <div className="mt-6 flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Added to cart
              </div>
            )}
          </div>
        </div>
        {/* Reviews */}
        <div className="mt-20 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <ProductReviews productId={product._id} productName={product.name} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ProductDetailContent;