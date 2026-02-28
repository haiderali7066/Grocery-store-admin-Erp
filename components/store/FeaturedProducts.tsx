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

  // Legacy handler kept for compatibility — ProductCard handles its own cart internally
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
      <div className="py-20 flex flex-col items-center justify-center space-y-4 font-mono">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        <p className="text-amber-800 font-mono font-medium animate-pulse">Loading amazing deals...</p>
      </div>
    );
  }

  return (
    <section className="py-6 md:py-8 bg-gradient-to-b from-amber-400 to-amber-500 overflow-hidden relative w-full font-mono">
      {/* Background decorative blobs */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-white" />
        <div className="absolute bottom-10 right-10 w-48 h-48 md:w-64 md:h-64 rounded-full bg-white" />
      </div>

      <div className="w-full px-4 sm:px-8 lg:px-16 relative z-20">
        {/* Header */}
        <div className="flex flex-row justify-between items-center gap-4 mb-4 md:mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-widest mb-1 font-mono">
              <Sparkles className="h-3 w-3" />
              Top Picks
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight font-mono tracking-tight">
              Featured <span className="text-amber-900">Products</span>
            </h2>
          </div>
          <button
            onClick={() => router.push("/products?featured=true")}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-amber-600 hover:bg-amber-900 hover:text-white transition-all duration-300 font-mono font-bold text-xs shadow-xl shadow-amber-600/20 shrink-0"
          >
            Explore All
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Marquee */}
        {products.length > 0 ? (
          <div
            className="group relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Soft edge fade */}
            <div className="absolute -left-1 top-0 bottom-0 w-12 sm:w-16 md:w-32 lg:w-48 bg-gradient-to-r from-amber-400 to-transparent z-30 pointer-events-none" />
            <div className="absolute -right-1 top-0 bottom-0 w-12 sm:w-16 md:w-32 lg:w-48 bg-gradient-to-l from-amber-500 to-transparent z-30 pointer-events-none" />

            {/* Marquee container */}
            <div className="flex overflow-hidden select-none border-y border-white/10 py-3 md:py-4">
              <div className={`flex gap-4 sm:gap-6 md:gap-8 flex-shrink-0 items-center min-w-full ${isPaused ? "pause-animation" : "animate-marquee"}`}>
                {[...Array(2)].map((_, arrayIndex) => (
                  <div key={`set-${arrayIndex}`} className="flex gap-4 sm:gap-6 md:gap-8 flex-shrink-0">
                    {products.map((product) => (
                      <div
                        key={`${product._id}-${arrayIndex}`}
                        className="w-[180px] sm:w-[210px] md:w-[240px] lg:w-[270px] shrink-0 transition-transform duration-300 hover:scale-[1.02]"
                      >
                        {/* Uses the exact same ProductCard component as the products page */}
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 mt-2 text-white/60 font-mono">
              {isPaused ? (
                <PauseCircle className="h-4 w-4 animate-pulse" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-tighter font-mono">
                {isPaused ? "Paused for viewing" : "Auto-scrolling"}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white/10 backdrop-blur-sm rounded-[2rem] border border-white/20">
            <p className="text-white font-mono font-medium text-lg">
              Checking the warehouse for new featured items...
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - (var(--marquee-gap) / 2))); }
        }
        .animate-marquee {
          --marquee-gap: 1rem;
          animation: marquee 40s linear infinite;
        }
        @media (min-width: 640px) { .animate-marquee { --marquee-gap: 1.5rem; } }
        @media (min-width: 768px) { .animate-marquee { --marquee-gap: 2rem; } }
        @media (max-width: 768px) { .animate-marquee { animation-duration: 25s; } }
        .pause-animation { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee { animation: none; overflow-x: auto; justify-content: flex-start; }
        }
      `}</style>
    </section>
  );
}