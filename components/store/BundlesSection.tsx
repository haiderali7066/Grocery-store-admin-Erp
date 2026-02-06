'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';

interface Bundle {
  _id: string;
  name: string;
  description: string;
  image: string;
  bundlePrice: number;
  discount: number;
  discountType: string;
  products: Array<{
    product: string;
    quantity: number;
    unit: string;
  }>;
}

export function BundlesSection() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const response = await fetch('/api/bundles?isActive=true&limit=6');
        if (response.ok) {
          const data = await response.json();
          setBundles(data.bundles);
        }
      } catch (error) {
        console.error('Failed to fetch bundles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBundles();
  }, []);

  const handleAddToCart = (bundleId: string) => {
    console.log('Add bundle to cart:', bundleId);
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Special Bundles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Special Bundles</h2>

        {bundles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => {
              const discountedPrice =
                bundle.discountType === 'percentage'
                  ? bundle.bundlePrice * (1 - bundle.discount / 100)
                  : bundle.bundlePrice - bundle.discount;

              return (
                <div
                  key={bundle._id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
                >
                  <div className="relative h-48 bg-gray-100">
                    {bundle.image ? (
                      <Image
                        src={bundle.image || "/placeholder.svg"}
                        alt={bundle.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                    {bundle.discount > 0 && (
                      <Badge className="absolute top-2 left-2 bg-green-600">
                        Save {bundle.discount}
                        {bundle.discountType === 'percentage' ? '%' : ' Rs.'}
                      </Badge>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {bundle.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {bundle.description}
                    </p>

                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl font-bold text-gray-900">
                        Rs. {discountedPrice.toFixed(0)}
                      </span>
                      {bundle.discount > 0 && (
                        <span className="text-sm text-gray-400 line-through">
                          Rs. {bundle.bundlePrice.toFixed(0)}
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleAddToCart(bundle._id)}
                      className="w-full bg-green-700 hover:bg-green-800"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add Bundle
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No bundles available</p>
          </div>
        )}
      </div>
    </div>
  );
}
