'use client';

import { Navbar } from '@/components/store/Navbar';
import { Footer } from '@/components/store/Footer';
import { useCart } from '@/components/cart/CartProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Plus, Minus } from 'lucide-react';
import AuthProvider from '@/components/auth/AuthProvider'; // Import AuthProvider
import CartProvider from '@/components/cart/CartProvider'; // Import CartProvider

function CartContent() {
  const { items, removeItem, updateQuantity, subtotal, gstAmount, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
        <p className="text-gray-600 mb-8">Start shopping to add items to your cart</p>
        <Button asChild className="bg-green-700 hover:bg-green-800">
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-white border border-gray-200 rounded-lg p-4"
                >
                  {/* Image */}
                  {item.image && (
                    <div className="relative w-24 h-24 bg-gray-100 rounded">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    {item.weight && (
                      <p className="text-sm text-gray-500">{item.weight}</p>
                    )}
                    <p className="font-bold text-green-700 mt-2">
                      Rs. {item.price.toFixed(0)}
                    </p>
                  </div>

                  {/* Quantity Control */}
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <p className="font-bold text-gray-800">
                      Rs. {(item.price * item.quantity).toFixed(0)}
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 mt-2 flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="h-fit sticky top-20">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4 border-b border-gray-200 pb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">Rs. {subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST (17%)</span>
                  <span className="font-semibold">Rs. {gstAmount.toFixed(0)}</span>
                </div>
              </div>

              <div className="flex justify-between mb-6 text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-green-700">
                  Rs. {total.toFixed(0)}
                </span>
              </div>

              <Button asChild className="w-full bg-green-700 hover:bg-green-800 mb-3">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>

              <Button variant="outline" asChild className="w-full bg-transparent">
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>

            {/* Promo Code */}
            <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promo Code
              </label>
              <div className="flex gap-2">
                <Input placeholder="Enter promo code" />
                <Button variant="outline">Apply</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CartContent />
      </main>
      <Footer />
    </div>
  );
}
