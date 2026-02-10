"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Heart } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider"; // Use CartProvider directly

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
  const { addItem } = useCart(); // Use CartProvider directly
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const addToCart = () => {
    addItem({
      id: product._id,
      name: product.name,
      price: discountedPrice,
      quantity: 1,
      image: imageUrl,
      weight: `${product.unitSize} ${product.unitType}`,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    addToCart();
    setShowSuccess(true);
    setTimeout(() => {
      setIsAdding(false);
      setShowSuccess(false);
    }, 600);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(); // Add item directly to cart
    router.push("/cart"); // Navigate to cart
  };

  return (
    <Link href={`/products/${product._id}`} className="group">
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-secondary cursor-pointer">
        {/* Image */}
        <div className="relative h-85 overflow-hidden bg-secondary">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            unoptimized
          />

          {/* Badges right */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
            {product.isHot && (
              <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Hot
              </div>
            )}
            {(product.isFlashSale || product.isNewArrival) && (
              <div className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
                Flash Sale
              </div>
            )}
            {product.discount > 0 && (
              <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                {savings}
              </div>
            )}
          </div>

          {/* Favorite */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsFavorite(!isFavorite);
            }}
            className="absolute top-3 left-3 bg-white/90 hover:bg-white rounded-full p-2.5 transition-all active:scale-95 shadow-md"
          >
            <Heart
              className={`h-5 w-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-foreground"}`}
            />
          </button>

          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold text-base">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {product.unitSize} {product.unitType}
          </p>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl font-bold text-foreground">
              Rs. {discountedPrice.toFixed(0)}
            </span>
            {product.discount > 0 && (
              <span className="text-sm text-muted-foreground line-through">
                Rs. {product.retailPrice.toFixed(0)}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || isAdding}
              className={`flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed justify-center flex items-center gap-2 ${showSuccess ? "scale-95 bg-green-600" : "scale-100"}`}
            >
              <ShoppingCart className="h-4 w-4" />
              {isAdding ? "Adding..." : showSuccess ? "Added!" : "Add"}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={product.stock === 0}
              className="flex-1 bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy Now
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse-scale {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
            }
            100% {
              transform: scale(0.95);
              opacity: 0.9;
            }
          }
        `}</style>
      </div>
    </Link>
  );
}
