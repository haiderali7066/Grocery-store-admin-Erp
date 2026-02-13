"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroBanner {
  title: string;
  subtitle: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
  sortOrder: number;
}

export function HeroCarousel() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        const raw: HeroBanner[] = data.settings?.heroBanners ?? [];
        const active = raw
          .filter((b) => b.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setBanners(active);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  const goToPrevious = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="relative w-full h-96 md:h-[500px] rounded-3xl bg-gray-200 animate-pulse" />
    );
  }

  // No active banners — show a plain fallback
  if (banners.length === 0) {
    return (
      <div className="relative w-full h-96 md:h-[500px] rounded-3xl bg-gradient-to-br from-primary/80 to-accent/60 flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Welcome</h2>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            Shop fresh quality groceries delivered to your doorstep
          </p>
          <a href="/products">
            <button className="px-8 py-3 rounded-full bg-white text-primary hover:shadow-2xl hover:scale-105 transition-all font-semibold">
              Shop Now
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-96 md:h-[500px] overflow-hidden rounded-3xl shadow-2xl group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {banners.map((banner, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
              index === currentSlide
                ? "opacity-100 translate-x-0 z-10"
                : index < currentSlide
                  ? "opacity-0 -translate-x-full z-0"
                  : "opacity-0 translate-x-full z-0"
            }`}
          >
            <div className="relative w-full h-full">
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/60">
                {banner.imageUrl && (
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title || `Banner ${index + 1}`}
                    fill
                    className="object-cover mix-blend-overlay"
                    priority={index === 0}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                )}
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 to-transparent">
                <div className="text-center text-white px-4 max-w-4xl">
                  {banner.title && (
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-2xl">
                      {banner.title}
                    </h2>
                  )}
                  {banner.subtitle && (
                    <p className="text-lg md:text-xl lg:text-2xl mb-8 drop-shadow-lg opacity-95">
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.link && (
                    <a href={banner.link}>
                      <button className="px-8 py-3 md:px-10 md:py-4 rounded-full bg-white text-primary hover:shadow-2xl hover:scale-105 transition-all font-semibold active:scale-95">
                        Shop Now
                      </button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-3 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-3 transition-all active:scale-95 opacity-0 group-hover:opacity-100"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "bg-white w-8"
                    : "bg-white/50 w-2 hover:bg-white/80 hover:w-4"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
