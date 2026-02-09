"use client";

import React from "react";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart } from "lucide-react";
import { useState } from "react";

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
  isNewArrival?: boolean; // Add this
  unitType: string;
  unitSize: number;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onAddToCart) {
      console.log("[v0] onAddToCart is not defined");
      return;
    }
    console.log("[v0] Adding product to cart:", product._id);
    setIsAdding(true);
    onAddToCart(product._id);
    setShowSuccess(true);
    setTimeout(() => {
      setIsAdding(false);
      setShowSuccess(false);
    }, 600);
  };

  // Use mainImage first, fallback to images array
  const imageUrl = product.mainImage || product.images?.[0];

  return (
    <Link href={`/products/${product._id}`}>
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-secondary group cursor-pointer">
        {/* Image Container */}
        <div className="relative h-85 overflow-hidden bg-secondary">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              unoptimized // Add this if you're having issues with Cloudinary
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground text-sm">
              No Image
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
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

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsFavorite(!isFavorite);
            }}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2.5 transition-all active:scale-95 shadow-md"
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
              }`}
            />
          </button>

          {/* Stock Status */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold text-base">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Name */}
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">
            {product.name}
          </h3>

          {/* Weight */}
          <p className="text-xs text-muted-foreground mb-3">
            {product.unitSize} {product.unitType}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-xl font-bold text-foreground">
              Rs. {discountedPrice.toFixed(0)}
            </span>
            {product.discount > 0 && (
              <span className="text-sm text-muted-foreground line-through">
                Rs. {product.retailPrice.toFixed(0)}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isAdding}
            className={`w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              showSuccess ? "scale-95 bg-green-600" : "scale-100"
            }`}
            style={{
              animation: showSuccess ? "pulse-scale 0.6s ease-out" : "none",
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            {isAdding ? "Adding..." : showSuccess ? "Added!" : "Add to Cart"}
          </button>
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
      </div>
    </Link>
  );
}
