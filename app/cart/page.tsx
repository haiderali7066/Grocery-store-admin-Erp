"use client";

import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus } from "lucide-react";

function CartContent() {
  const { items, removeItem, updateQuantity, subtotal, gstAmount, total } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-32">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Your Cart is Empty
        </h2>
        <p className="text-gray-600 mb-8">
          Start shopping to add items to your cart
        </p>
        <Button
          asChild
          className="bg-green-700 hover:bg-green-800 px-6 py-3 rounded-md text-white"
        >
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-10 text-gray-900">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                <div className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {item.name}
                    </h3>
                    {item.weight && (
                      <p className="text-sm text-gray-500">{item.weight}</p>
                    )}
                    <p className="mt-2 font-bold text-green-700 text-lg">
                      Rs. {item.price.toFixed(0)}
                    </p>
                  </div>

                  {/* Quantity & Remove */}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-gray-700">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="flex flex-col justify-between text-right">
                  <p className="font-semibold text-gray-800 text-lg">
                    Rs. {(item.price * item.quantity).toFixed(0)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="h-fit sticky top-24">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-5 text-gray-900">
                Order Summary
              </h2>

              <div className="space-y-3 mb-5 border-b border-gray-200 pb-5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">
                    Rs. {subtotal.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST (17%)</span>
                  <span className="font-semibold">
                    Rs. {gstAmount.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between mb-6 text-xl font-bold text-gray-900">
                <span>Total</span>
                <span className="text-green-700">Rs. {total.toFixed(0)}</span>
              </div>

              <Button
                asChild
                className="w-full bg-green-700 hover:bg-green-800 text-white mb-3 rounded-lg py-3"
              >
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full rounded-lg py-3 border-gray-300"
              >
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>

            {/* Promo Code */}
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promo Code
              </label>
              <div className="flex gap-2">
                <Input placeholder="Enter promo code" className="flex-1" />
                <Button variant="outline" className="px-4 py-2 rounded-lg">
                  Apply
                </Button>
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CartContent />
      </main>
      <Footer />
    </div>
  );
}
