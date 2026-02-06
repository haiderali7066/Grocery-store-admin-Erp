'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const { addItem } = useCart();
  
  const itemsPerView = 4;
  const totalSlides = Math.max(1, Math.ceil(products.length / itemsPerView));

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch('/api/products?isFeatured=true&limit=12');
        if (response.ok) {
          const data = await response.json();
          console.log('[v0] Featured products fetched:', data.products?.length || 0);
          setProducts(data.products || []);
        } else {
          console.error('[v0] Failed to fetch featured products - Status:', response.status);
          const errorData = await response.json();
          console.error('[v0] Error details:', errorData);
        }
      } catch (error) {
        console.error('[v0] Failed to fetch featured products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (products.length === 0 || totalSlides <= 1) return;
    
    const autoRotateTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(autoRotateTimer);
  }, [products.length, totalSlides]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const visibleProducts = products.slice(
    currentIndex * itemsPerView,
    currentIndex * itemsPerView + itemsPerView
  );

  const handleAddToCart = (productId: string) => {
    console.log('[v0] handleAddToCart called with productId:', productId);
    const product = products.find(p => p._id === productId);
    if (!product) {
      console.log('[v0] Product not found:', productId);
      return;
    }

    console.log('[v0] Adding item to cart:', product.name);
    addItem({
      id: product._id,
      name: product.name,
      price: product.retailPrice,
      quantity: 1,
      weight: `${product.unitSize} ${product.unitType}`,
      discount: product.discount,
    });
    console.log('[v0] Item added successfully');
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-amber-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold text-foreground">Featured Products</h2>
            <p className="text-muted-foreground mt-2">Handpicked items updated daily</p>
          </div>
          <button
            onClick={() => router.push('/products?featured=true')}
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all font-semibold text-sm"
          >
            View All
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(itemsPerView)].map((_, i) => (
              <div key={i} className="bg-secondary rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="relative">
            {/* Carousel Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {visibleProducts.map((product, idx) => (
                <div key={product._id} className="animate-fade-in">
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            {totalSlides > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={handlePrev}
                  className="p-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-95"
                  aria-label="Previous"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Indicators */}
                <div className="flex gap-2">
                  {Array.from({ length: totalSlides }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentIndex
                          ? 'bg-primary w-8'
                          : 'bg-muted w-2'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="p-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-95"
                  aria-label="Next"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No featured products available</p>
          </div>
        )}
      </div>
    </div>
  );
}
