"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import {
  ChevronRight,
  Sparkles,
  Loader2,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

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
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;

    addItem({
      id: product._id,
      name: product.name,
      price: product.retailPrice,
      quantity: 1,
      weight: `${product.unitSize} ${product.unitType}`,
      discount: product.discount,
    });
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        <p className="text-amber-800 font-medium animate-pulse">
          Loading amazing deals...
        </p>
      </div>
    );
  }

  return (
    <section className="py-12 md:py-20 bg-gradient-to-b from-amber-400 to-amber-500 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-white" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-10 md:mb-16">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-widest mb-3">
              <Sparkles className="h-3 w-3" />
              Top Picks
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Featured <span className="text-amber-900">Products</span>
            </h2>
            <p className="text-amber-100 mt-2 text-sm md:text-lg max-w-md">
              Handpicked premium items refreshed every 24 hours.
            </p>
          </div>

          <button
            onClick={() => router.push("/products?featured=true")}
            className="group flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-amber-600 hover:bg-amber-900 hover:text-white transition-all duration-300 font-bold text-sm shadow-xl shadow-amber-600/20"
          >
            Explore All
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {products.length > 0 ? (
          <div
            className="group relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Soft Edge Blurring */}
            <div className="absolute -left-1 top-0 bottom-0 w-16 md:w-40 bg-gradient-to-r from-amber-400 to-transparent z-30 pointer-events-none" />
            <div className="absolute -right-1 top-0 bottom-0 w-16 md:w-40 bg-gradient-to-l from-amber-500 to-transparent z-30 pointer-events-none" />

            {/* Marquee Container */}
            <div className="flex overflow-hidden select-none border-y border-white/10 py-8">
              <div
                className={`flex gap-4 md:gap-8 flex-shrink-0 items-center justify-around min-w-full ${
                  isPaused ? "pause-animation" : "animate-marquee"
                }`}
              >
                {/* First set of products */}
                {products.map((product) => (
                  <div
                    key={`${product._id}-1`}
                    className="w-[280px] md:w-[320px] transition-transform duration-300 hover:scale-[1.02]"
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {products.map((product) => (
                  <div
                    key={`${product._id}-2`}
                    className="w-[280px] md:w-[320px] transition-transform duration-300 hover:scale-[1.02]"
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Status Indicator */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60">
              {isPaused ? (
                <PauseCircle className="h-4 w-4 animate-pulse" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {isPaused ? "Paused for viewing" : "Auto-scrolling"}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white/10 backdrop-blur-sm rounded-[3rem] border border-white/20">
            <p className="text-white font-medium text-lg">
              Checking the warehouse for new featured items...
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-50% - 1rem));
          }
        }

        .animate-marquee {
          animation: marquee 40s linear infinite;
        }

        @media (max-width: 768px) {
          .animate-marquee {
            animation-duration: 25s;
          }
        }

        .pause-animation {
          animation-play-state: paused;
        }

        /* Support for reduced motion accessibility */
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
            overflow-x: auto;
            justify-content: flex-start;
          }
        }
      `}</style>
    </section>
  );
}
