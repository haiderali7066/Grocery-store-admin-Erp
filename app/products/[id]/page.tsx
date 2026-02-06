'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/store/Navbar';
import { Footer } from '@/components/store/Footer';
import { useCart } from '@/components/cart/CartProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Minus, ArrowLeft, Zap, File as Fire } from 'lucide-react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/components/cart/CartProvider';

interface Product {
  _id: string;
  name: string;
  retailPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  unitSize: number;
  unitType: string;
  stock: number;
  category: string;
  mainImage?: string;
  images?: string[];
  description?: string;
  isFlashSale: boolean;
  isHot: boolean;
  isFeatured: boolean;
}

function ProductDetailContent() {
  const params = useParams();
  const productId = params?.id as string;
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
        if (data.product.weight) {
          setSelectedWeight(data.product.weight);
        }
      }
    } catch (error) {
      console.error('[Product Detail] Failed to fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!product) return 0;

    let price = product.retailPrice;

    if (product.discount) {
      if (product.discountType === 'percentage') {
        price = price - (price * product.discount) / 100;
      } else {
        price = price - product.discount;
      }
    }

    return Math.max(0, price);
  };

  const calculateGST = (price: number) => {
    return (price * 0.17).toFixed(2);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!selectedWeight) {
      alert('Please select a weight');
      return;
    }

    setIsAdding(true);
    try {
      const finalPrice = calculatePrice();
      const gst = parseFloat(calculateGST(finalPrice));

      addItem({
        id: product._id,
        name: product.name,
        price: finalPrice + gst,
        quantity,
        weight: selectedWeight,
        image: product.image,
      });

      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      setQuantity(1);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">Loading product...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Product not found</p>
            <Button asChild className="bg-green-700">
              <Link href="/products">Back to Products</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const finalPrice = calculatePrice();
  const gst = calculateGST(finalPrice);
  const totalWithGST = finalPrice + parseFloat(gst);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Button
          asChild
          variant="ghost"
          className="mb-6 text-gray-700 hover:text-green-700"
        >
          <Link href="/products" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-gray-100 rounded-lg overflow-hidden h-96 md:h-full">
            {product.image ? (
              <Image
                src={product.image || '/placeholder.svg'}
                alt={product.name}
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col justify-between">
            {/* Tags */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {product.isFlashSale && (
                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Zap className="h-4 w-4" />
                  Flash Sale
                </span>
              )}
              {product.isHot && (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Fire className="h-4 w-4" />
                  Hot Product
                </span>
              )}
              {product.isFeatured && (
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Featured
                </span>
              )}
            </div>

            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600 mb-6">
                Category: <span className="font-medium text-gray-900">{product.category}</span>
              </p>

              {product.description && (
                <p className="text-gray-700 mb-6">{product.description}</p>
              )}

              {/* Weight Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight / Size
                </label>
                <select
                  value={selectedWeight}
                  onChange={(e) => setSelectedWeight(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select weight...</option>
                  {product.weight && (
                    <option value={product.weight}>
                      {product.weight} {product.weightUnit}
                    </option>
                  )}
                </select>
              </div>

              {/* Pricing */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-green-700">Rs. {finalPrice.toFixed(0)}</span>
          {product.discount > 0 && (
            <span className="text-lg text-gray-500 line-through">
              Rs. {product.retailPrice.toFixed(0)}
                    </span>
                  )}
                </div>

                {product.discount > 0 && (
                  <p className="text-sm text-orange-600 font-medium">
                    Save {product.discountType === 'percentage' ? product.discount + '%' : 'Rs. ' + product.discount}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>Rs. {finalPrice.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST (17%):</span>
                    <span>Rs. {gst}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total:</span>
                    <span>Rs. {totalWithGST.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Stock Status */}
              <div className={`mb-6 p-3 rounded-lg ${product.stock > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="text-sm font-medium">
                  {product.stock > 0
                    ? `${product.stock} items in stock`
                    : 'Out of stock'}
                </p>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6 flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Quantity:</label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 text-center border-0 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={!product || product.stock === 0 || isAdding || !selectedWeight}
                className="w-full bg-green-700 hover:bg-green-800 text-white py-3 text-lg font-semibold"
              >
                {isAdding ? 'Adding...' : 'Add to Cart'}
              </Button>

              {/* Notification */}
              {showNotification && (
                <div className="mt-4 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded">
                  Product added to cart successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ProductDetailContent;
