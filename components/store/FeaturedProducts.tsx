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
    <section className="py-12 md:py-20 lg:py-24 2xl:py-32 bg-gradient-to-b from-amber-400 to-amber-500 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-24 h-24 md:w-32 md:h-32 2xl:w-64 2xl:h-64 rounded-full bg-white" />
        <div className="absolute bottom-10 right-10 w-48 h-48 md:w-64 md:h-64 2xl:w-96 2xl:h-96 rounded-full bg-white" />
      </div>

      {/* Main Container - Expanded for ultra-wide screens */}
      <div className="w-full max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-12 2xl:px-24 relative z-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 md:mb-16 2xl:mb-20">
          <div className="text-left w-full md:w-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-full text-white text-xs 2xl:text-sm font-bold uppercase tracking-widest mb-3 md:mb-4">
              <Sparkles className="h-3 w-3 2xl:h-4 2xl:w-4" />
              Top Picks
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl font-black text-white leading-tight">
              Featured <span className="text-amber-900">Products</span>
            </h2>
            <p className="text-amber-100 mt-2 md:mt-4 text-sm sm:text-base md:text-lg 2xl:text-xl max-w-md 2xl:max-w-2xl">
              Handpicked premium items refreshed every 24 hours.
            </p>
          </div>

          <button
            onClick={() => router.push("/products?featured=true")}
            className="group flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3.5 2xl:px-8 2xl:py-4 rounded-2xl bg-white text-amber-600 hover:bg-amber-900 hover:text-white transition-all duration-300 font-bold text-sm 2xl:text-base shadow-xl shadow-amber-600/20"
          >
            Explore All
            <ChevronRight className="h-4 w-4 2xl:h-5 2xl:w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Products Marquee Section */}
        {products.length > 0 ? (
          <div
            className="group relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Soft Edge Blurring - Scales with screen size */}
            <div className="absolute -left-1 top-0 bottom-0 w-12 sm:w-16 md:w-32 lg:w-48 2xl:w-64 bg-gradient-to-r from-amber-400 to-transparent z-30 pointer-events-none" />
            <div className="absolute -right-1 top-0 bottom-0 w-12 sm:w-16 md:w-32 lg:w-48 2xl:w-64 bg-gradient-to-l from-amber-500 to-transparent z-30 pointer-events-none" />

            {/* Marquee Container */}
            <div className="flex overflow-hidden select-none border-y border-white/10 py-8 2xl:py-12">
              <div
                className={`flex gap-4 sm:gap-6 md:gap-8 2xl:gap-12 flex-shrink-0 items-center min-w-full ${
                  isPaused ? "pause-animation" : "animate-marquee"
                }`}
              >
                {/* Render multiple sets to ensure seamless looping on ultra-wides.
                  If the screen is massive, we need enough duplicate items to fill the view.
                */}
                {[...Array(2)].map((_, arrayIndex) => (
                  <div
                    key={`set-${arrayIndex}`}
                    className="flex gap-4 sm:gap-6 md:gap-8 2xl:gap-12 flex-shrink-0"
                  >
                    {products.map((product) => (
                      <div
                        key={`${product._id}-${arrayIndex}`}
                        // Responsive card widths depending on screen size
                        className="w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px] 2xl:w-[420px] shrink-0 transition-transform duration-300 hover:scale-[1.02]"
                      >
                        <ProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Status Indicator */}
            <div className="absolute -bottom-8 2xl:-bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/80 md:text-white/60">
              {isPaused ? (
                <PauseCircle className="h-4 w-4 2xl:h-5 2xl:w-5 animate-pulse" />
              ) : (
                <PlayCircle className="h-4 w-4 2xl:h-5 2xl:w-5" />
              )}
              <span className="text-[10px] 2xl:text-xs font-bold uppercase tracking-tighter">
                {isPaused ? "Paused for viewing" : "Auto-scrolling"}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 2xl:py-32 bg-white/10 backdrop-blur-sm rounded-[2rem] 2xl:rounded-[3rem] border border-white/20">
            <p className="text-white font-medium text-lg 2xl:text-2xl">
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
            /* Exactly half the width to seamlessly loop the two duplicated blocks */
            transform: translateX(calc(-50% - (var(--marquee-gap) / 2)));
          }
        }

        .animate-marquee {
          /* Added a CSS variable fallback gap mapping if needed, 
             but typically flex translation on half width is smooth if parent gap matches children gap */
          --marquee-gap: 1rem; /* Adjust fallback gap for mobile */
          animation: marquee 40s linear infinite;
        }

        @media (min-width: 640px) {
          .animate-marquee {
            --marquee-gap: 1.5rem;
          }
        }
        @media (min-width: 768px) {
          .animate-marquee {
            --marquee-gap: 2rem;
          }
        }
        @media (min-width: 1536px) {
          .animate-marquee {
            --marquee-gap: 3rem;
          }
        }

        @media (max-width: 768px) {
          .animate-marquee {
            animation-duration: 25s; /* Faster on mobile */
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
