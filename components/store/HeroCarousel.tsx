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

  // ✅ FULL SCREEN HEIGHT
  const layoutClasses =
    "relative w-full h-screen max-w-[1920px] mx-auto rounded-none  overflow-hidden shadow-2xl";

  if (isLoading) {
    return <div className={`${layoutClasses} bg-gray-200 animate-pulse`} />;
  }

  if (banners.length === 0) {
    return (
      <div
        className={`${layoutClasses} bg-gradient-to-br from-primary/80 to-accent/60 flex items-center justify-center`}
      >
        <div className="text-center text-white px-6">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
            Welcome
          </h2>
          <p className="text-lg md:text-xl lg:text-2xl mb-8 opacity-90">
            Shop fresh quality groceries delivered to your doorstep
          </p>
          <a href="/products">
            <button className="px-8 py-4 rounded-full bg-white text-primary hover:shadow-2xl hover:scale-105 transition-all font-semibold">
              Shop Now
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${layoutClasses} group`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
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
              <div className="absolute inset-0">
                {banner.imageUrl && (
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title || `Banner ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                )}
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white px-6 sm:px-12 max-w-5xl">
                  {banner.title && (
                    <h2 className="text-5xl md:text-7xl xl:text-8xl font-bold mb-6 drop-shadow-2xl leading-tight">
                      {banner.title}
                    </h2>
                  )}
                  {banner.subtitle && (
                    <p className="text-lg md:text-2xl xl:text-3xl mb-8 drop-shadow-lg opacity-95">
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.link && (
                    <a href={banner.link}>
                      <button className="px-10 py-4 rounded-full bg-white text-primary hover:shadow-2xl hover:scale-105 transition-all font-semibold">
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

      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-4 transition-all"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-4 transition-all"
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </button>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === currentSlide
                    ? "bg-white w-12"
                    : "bg-white/50 w-3 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}