"use client";

import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, Truck, Tag, Package } from "lucide-react";

// ── Bundle image grid (shows up to 4 product thumbnails) ─────────────────────

function BundleImageGrid({ bundleProducts, bundleName }: { bundleProducts: any[]; bundleName: string }) {
  const images = bundleProducts
    .filter((bp) => bp.image)
    .slice(0, 4);

  if (images.length === 0) {
    return (
      <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-green-50 border border-green-100 flex flex-col items-center justify-center gap-1">
        <Package className="h-8 w-8 text-green-400" />
        <span className="text-[10px] font-bold text-green-500 uppercase">Bundle</span>
      </div>
    );
  }

  // 1 image → full size, 2 → split in half, 3-4 → 2×2 grid
  return (
    <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
      {images.length === 1 && (
        <Image src={images[0].image} alt={bundleName} fill className="object-cover" unoptimized />
      )}
      {images.length === 2 && (
        <div className="grid grid-cols-2 h-full">
          {images.map((bp, i) => (
            <div key={i} className="relative">
              <Image src={bp.image} alt={bp.name || ""} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}
      {images.length >= 3 && (
        <div className="grid grid-cols-2 grid-rows-2 h-full">
          {images.slice(0, 4).map((bp, i) => (
            <div key={i} className="relative">
              <Image src={bp.image} alt={bp.name || ""} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}
      {/* Bundle badge overlay */}
      <div className="absolute bottom-1 left-1 bg-green-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
        <Package className="h-2 w-2" /> BUNDLE
      </div>
    </div>
  );
}

// ── Cart Content ──────────────────────────────────────────────────────────────

function CartContent() {
  const {
    items, removeItem, updateQuantity,
    subtotal, taxAmount, taxRate, taxName, taxEnabled,
    shippingCost, total,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-32">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
        <p className="text-gray-600 mb-8">Start shopping to add items to your cart</p>
        <Button asChild className="bg-green-700 hover:bg-green-800 px-6 py-3 rounded-md text-white">
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-10 text-gray-900">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <div key={item.id} className={`flex gap-6 bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${item.isBundle ? "border-green-200" : "border-gray-200"}`}>
                
                {/* Image — bundle grid or single */}
                {item.isBundle && Array.isArray(item.bundleProducts) && item.bundleProducts.length > 0 ? (
                  <BundleImageGrid bundleProducts={item.bundleProducts} bundleName={item.name} />
                ) : (
                  <div className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                    )}
                  </div>
                )}

                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                      {item.isBundle && (
                        <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase border border-green-200">
                          Bundle
                        </span>
                      )}
                    </div>

                    {/* Bundle product list */}
                    {item.isBundle && Array.isArray(item.bundleProducts) && item.bundleProducts.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {item.bundleProducts.map((bp: any, i: number) => (
                          <p key={i} className="text-xs text-gray-400 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />
                            {bp.name}{bp.quantity > 1 ? ` ×${bp.quantity}` : ""}
                          </p>
                        ))}
                      </div>
                    )}

                    {!item.isBundle && item.weight && (
                      <p className="text-sm text-gray-500">{item.weight}</p>
                    )}
                    <p className="mt-2 font-bold text-green-700 text-lg">Rs. {item.price.toFixed(0)}</p>
                  </div>

                  {/* Quantity & Remove */}
                  <div className="flex items-center gap-3 mt-3">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-gray-700">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>

                {/* Line total */}
                <div className="flex flex-col justify-between text-right">
                  <p className="font-semibold text-gray-800 text-lg">Rs. {(item.price * item.quantity).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="h-fit sticky top-24">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-5 text-gray-900">Order Summary</h2>

              <div className="space-y-3 mb-5 border-b border-gray-200 pb-5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">Rs. {subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {taxEnabled ? <>{taxName} ({taxRate}%)</> : <span className="text-gray-400 line-through">Tax</span>}
                  </span>
                  <span className={`font-semibold ${!taxEnabled ? "text-gray-400" : ""}`}>
                    {taxEnabled ? `Rs. ${taxAmount.toFixed(0)}` : <span className="text-xs bg-gray-100 px-2 py-1 rounded">Disabled</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-1"><Truck className="h-4 w-4" /> Shipping</span>
                  {shippingCost === 0
                    ? <span className="font-semibold text-green-600">Free</span>
                    : <span className="font-semibold">Rs. {shippingCost.toFixed(0)}</span>}
                </div>
              </div>

              <div className="flex justify-between mb-6 text-xl font-bold text-gray-900">
                <span>Total</span>
                <span className="text-green-700">Rs. {total.toFixed(0)}</span>
              </div>

              <Button asChild className="w-full bg-green-700 hover:bg-green-800 text-white mb-3 rounded-lg py-3">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
              <Button variant="outline" asChild className="w-full rounded-lg py-3 border-gray-300">
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>

            {/* Promo Code */}
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" /> Promo Code
              </label>
              <div className="flex gap-2">
                <Input placeholder="Enter promo code" className="flex-1" />
                <Button variant="outline" className="px-4 py-2 rounded-lg">Apply</Button>
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