"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import { useRouter } from "next/navigation";
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
  unitType: string;
  unitSize: number;
  stock: number;
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const router = useRouter();
  const { addItem } = useCart();

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch("/api/products?isFeatured=true&limit=12");
        if (response.ok) {
          const data = await response.json();
          console.log(
            "[v0] Featured products fetched:",
            data.products?.length || 0,
          );
          setProducts(data.products || []);
        } else {
          console.error(
            "[v0] Failed to fetch featured products - Status:",
            response.status,
          );
          const errorData = await response.json();
          console.error("[v0] Error details:", errorData);
        }
      } catch (error) {
        console.error("[v0] Failed to fetch featured products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  const handleAddToCart = (productId: string) => {
    console.log("[v0] handleAddToCart called with productId:", productId);
    const product = products.find((p) => p._id === productId);
    if (!product) {
      console.log("[v0] Product not found:", productId);
      return;
    }

    console.log("[v0] Adding item to cart:", product.name);
    addItem({
      id: product._id,
      name: product.name,
      price: product.retailPrice,
      quantity: 1,
      weight: `${product.unitSize} ${product.unitType}`,
      discount: product.discount,
    });
    console.log("[v0] Item added successfully");
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 h-64 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-amber-500 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold text-foreground">
              Featured Products
            </h2>
            <p className="text-muted-foreground mt-2">
              Handpicked items updated daily
            </p>
          </div>
          <button
            onClick={() => router.push("/products?featured=true")}
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all font-semibold text-sm"
          >
            View All
          </button>
        </div>

        {products.length > 0 ? (
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Gradient Overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-amber-500 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-amber-500 to-transparent z-10 pointer-events-none" />

            {/* Scrolling Train Container */}
            <div className="overflow-hidden">
              <div className={`flex gap-6 ${isPaused ? "" : "animate-scroll"}`}>
                {products.map((product) => (
                  <div key={product._id} className="flex-shrink-0 w-72">
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pause indicator */}
            {isPaused && (
              <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-20">
                Paused
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No featured products available
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
