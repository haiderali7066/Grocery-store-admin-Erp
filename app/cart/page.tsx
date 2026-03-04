"use client";

// FILE PATH: app/(store)/cart/page.tsx

import { Navbar }    from "@/components/store/Navbar";
import { Footer }    from "@/components/store/Footer";
import { useCart }   from "@/components/cart/CartProvider";
import { Button }    from "@/components/ui/button";
import Image         from "next/image";
import Link          from "next/link";
import {
  Trash2,
  Plus,
  Minus,
  Truck,
  AlertTriangle,
  Layers,
} from "lucide-react";

// ─── Cart Content ─────────────────────────────────────────────────────────────

function CartContent() {
  const {
    items,
    removeItem,
    updateQuantity,
    subtotal,
    taxAmount,
    taxRate,
    taxName,
    taxEnabled,
    shippingCost,
    total,
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

  // Group lines by product id so we can display batch-split lines together
  // and show the total qty / stock status per product
  const productGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!item.isBundle) {
      (acc[item.id] ??= []).push(item);
    }
    return acc;
  }, {});

  // Build a flat display order: regular items grouped, then bundles
  const regularItems  = items.filter((i) => !i.isBundle);
  const bundleItems   = items.filter((i) =>  i.isBundle);
  const displayItems  = [...regularItems, ...bundleItems];

  return (
    <div className="py-10">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-10 text-gray-900">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Cart lines ── */}
          <div className="lg:col-span-2 space-y-4">
            {displayItems.map((item, idx) => {
              const stockLimit = item.stock as number | undefined;
              const atMax      = stockLimit !== undefined && item.quantity >= stockLimit;

              // Is this a secondary line for the same product (different batch price)?
              const linesForProduct = productGroups[item.id] ?? [];
              const isSecondBatch   =
                !item.isBundle &&
                linesForProduct.length > 1 &&
                linesForProduct[0].cartKey !== item.cartKey;

              // Total units of this product across all batch lines
              const totalForProduct = linesForProduct.reduce((s, i) => s + i.quantity, 0);

              return (
                <div
                  key={item.cartKey}
                  className={`flex gap-6 bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${
                    isSecondBatch
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-gray-200"
                  }`}
                >
                  {/* Image */}
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

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {item.name}
                        </h3>
                        {isSecondBatch && (
                          <span className="text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Layers className="h-2.5 w-2.5" /> Batch 2 price
                          </span>
                        )}
                        {item.isBundle && (
                          <span className="text-[10px] font-black bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            Bundle
                          </span>
                        )}
                      </div>
                      {item.weight && (
                        <p className="text-sm text-gray-500">{item.weight}</p>
                      )}
                      <p className={`mt-1 font-bold text-lg ${
                        isSecondBatch ? "text-amber-600" : "text-green-700"
                      }`}>
                        Rs. {item.price.toFixed(0)}
                        <span className="text-xs font-normal text-gray-400 ml-1">/ unit</span>
                      </p>

                      {/* Stock ceiling warning */}
                      {atMax && (
                        <p className="mt-1 text-xs text-orange-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Max available ({stockLimit}) in cart
                        </p>
                      )}
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => {
                          if (item.quantity <= 1) removeItem(item.cartKey);
                          else updateQuantity(item.cartKey, item.quantity - 1);
                        }}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium text-gray-700">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          if (atMax) return;
                          updateQuantity(item.cartKey, item.quantity + 1);
                        }}
                        disabled={atMax}
                        className={`p-2 rounded-md transition ${
                          atMax
                            ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.cartKey)}
                        className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  </div>

                  {/* Line total */}
                  <div className="flex flex-col justify-end text-right">
                    <p className="font-semibold text-gray-800 text-lg">
                      Rs. {(item.price * item.quantity).toFixed(0)}
                    </p>
                    {/* Show combined total when there are two batch lines */}
                    {!isSecondBatch && linesForProduct.length > 1 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {totalForProduct} units total
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Order Summary ── */}
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
                    {taxEnabled ? (
                      <>{taxName} ({taxRate}%)</>
                    ) : (
                      <span className="text-gray-400 line-through">Tax</span>
                    )}
                  </span>
                  <span className={!taxEnabled ? "text-gray-400" : "font-semibold"}>
                    {taxEnabled
                      ? `Rs. ${taxAmount.toFixed(0)}`
                      : <span className="text-xs bg-gray-100 px-2 py-1 rounded">Disabled</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Truck className="h-4 w-4" /> Shipping
                  </span>
                  {shippingCost === 0 ? (
                    <span className="font-semibold text-green-600">Free</span>
                  ) : (
                    <span className="font-semibold">Rs. {shippingCost.toFixed(0)}</span>
                  )}
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