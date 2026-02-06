'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch hero banners from API
    const fetchBanners = async () => {
      try {
        const response = await fetch('/api/banners');
        if (response.ok) {
          const data = await response.json();
          setBanners(data.banners);
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [banners]);

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  if (isLoading || banners.length === 0) {
    return (
      <div className="w-full h-96 md:h-[500px] bg-gradient-to-br from-primary to-accent/40 flex items-center justify-center rounded-3xl overflow-hidden">
        <div className="text-center text-primary-foreground px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Welcome to Khas Pure Food</h1>
          <p className="text-lg md:text-xl text-primary-foreground/90">Fresh, Quality, Trusted Groceries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 md:h-[500px] overflow-hidden rounded-3xl shadow-2xl">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute w-full h-full transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="relative w-full h-full bg-gradient-to-br from-primary/80 to-accent/40">
            {banner.image && (
              <Image
                src={banner.image || "/placeholder.svg"}
                alt={banner.title}
                fill
                className="object-cover opacity-90"
                priority
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-primary-foreground px-4">
                <h2 className="text-3xl md:text-5xl font-bold mb-3">{banner.title}</h2>
                <p className="text-lg md:text-xl mb-8 text-primary-foreground/90">{banner.subtitle}</p>
                <button className="px-8 py-3 md:py-4 rounded-full bg-primary-foreground text-primary hover:shadow-lg transition-all font-semibold active:scale-95">
                  <a href={banner.link}>Shop Now</a>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Buttons */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-3 transition-all active:scale-95"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-3 transition-all active:scale-95"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-white w-8' 
                    : 'bg-white/50 w-2.5 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
