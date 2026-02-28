"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { ProductCard } from "./ProductCard";
import { ChevronRight, Sparkles, Loader2, PauseCircle, PlayCircle } from "lucide-react";

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

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const router = useRouter();

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

  if (isLoading) {
    return (
      <section className="py-8 bg-gradient-to-b from-amber-400 to-amber-500">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/80 font-medium animate-pulse text-sm">Loading amazing deals...</p>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-1 md:py-8 bg-gradient-to-b from-amber-400 to-amber-500 overflow-hidden relative w-full">

      {/* Background blobs */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-white" />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-16 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-widest mb-1.5">
              <Sparkles className="h-3 w-3" /> Top Picks
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">
              Featured <span className="text-amber-900">Products</span>
            </h2>
          </div>
          <button
            onClick={() => router.push("/products?featured=true")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-amber-600 hover:bg-amber-900 hover:text-white transition-all duration-300 font-bold text-xs shadow-lg shrink-0"
          >
            Explore All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Marquee */}
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Edge fades */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-amber-400 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-amber-500 to-transparent z-10 pointer-events-none" />

        {/* Track — height fixed to card height (220px image + 140px content = 360px) + padding */}
        <div className="flex overflow-hidden select-none py-3">
          <div className={`flex gap-4 flex-shrink-0 items-start ${isPaused ? "pause-marquee" : "run-marquee"}`}>
            {[0, 1].map((setIdx) => (
              <div key={setIdx} className="flex gap-4 flex-shrink-0">
                {products.map((product) => (
                  <ProductCard
                    key={`${product._id}-${setIdx}`}
                    product={product}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 mt-1 text-white/60">
          {isPaused
            ? <PauseCircle className="h-3.5 w-3.5 animate-pulse" />
            : <PlayCircle className="h-3.5 w-3.5" />
          }
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {isPaused ? "Paused" : "Auto-scrolling"}
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .run-marquee {
          animation: marquee 40s linear infinite;
        }
        @media (max-width: 768px) {
          .run-marquee { animation-duration: 25s; }
        }
        .pause-marquee {
          animation: marquee 40s linear infinite;
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .run-marquee, .pause-marquee {
            animation: none;
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}