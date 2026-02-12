"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Heart, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

interface Product {
  _id: string;
  name: string;
  retailPrice: number;
  discount: number;
  discountType: string;
  images?: string[];
  mainImage?: string;
  isHot: boolean;
  isFlashSale: boolean;
  isFeatured: boolean;
  isNewArrival?: boolean;
  unitType: string;
  unitSize: number;
  stock: number;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 1. HIDDEN IF OUT OF STOCK
  if (!product.stock || product.stock <= 0) {
    return null;
  }

  // Price Logic
  const discountedPrice =
    product.discountType === "percentage"
      ? product.retailPrice * (1 - product.discount / 100)
      : product.retailPrice - product.discount;

  const savings =
    product.discountType === "percentage"
      ? `${product.discount}% OFF`
      : `Rs. ${product.discount} OFF`;

  const imageUrl =
    product.mainImage || product.images?.[0] || "/placeholder.svg";

  // Handlers
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAdding(true);

    addItem({
      id: product._id,
      name: product.name,
      price: discountedPrice,
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
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();

    addItem({
      id: product._id,
      name: product.name,
      price: discountedPrice,
      quantity: 1,
      image: imageUrl,
      weight: `${product.unitSize} ${product.unitType}`,
    });
    router.push("/cart");
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <Link href={`/products/${product._id}`} className="group h-full block">
      <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 relative">
        {/* 2. IMAGE SECTION - Changed to aspect-square to fix 'portrait' look */}
        <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />

          {/* Badges - Top Left (Cleaner Look) */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {product.discount > 0 && (
              <span className="bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm">
                -
                {product.discountType === "percentage"
                  ? `${product.discount}%`
                  : `Rs.${product.discount}`}
              </span>
            )}
            {(product.isHot || product.isFlashSale) && (
              <span className="bg-amber-400 text-black text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm">
                HOT
              </span>
            )}
          </div>

          {/* Wishlist Button - Top Right */}
          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-red-500 transition-colors shadow-sm"
          >
            <Heart
              className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
            />
          </button>
        </div>

        {/* 3. CONTENT SECTION - Flex-grow to push buttons to bottom */}
        <div className="flex flex-col flex-grow p-3 sm:p-4">
          <div className="flex-grow">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">
              {product.unitSize} {product.unitType}
            </p>

            <h3 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 mb-2 group-hover:text-green-700 transition-colors">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-base sm:text-lg font-bold text-gray-900">
                Rs. {discountedPrice.toLocaleString()}
              </span>
              {product.discount > 0 && (
                <span className="text-xs sm:text-sm text-gray-400 line-through">
                  Rs. {product.retailPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 border
                ${
                  showSuccess
                    ? "bg-green-100 border-green-200 text-green-700"
                    : "bg-white border-gray-200 text-gray-900 hover:border-gray-900 hover:bg-gray-50"
                }`}
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
              className="flex items-center justify-center py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors shadow-sm"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
