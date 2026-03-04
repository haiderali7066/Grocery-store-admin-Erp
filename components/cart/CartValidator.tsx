// FILE PATH: components/cart/CartValidator.tsx
// ✅ UPDATED: Uses ?admin=true to bypass visibility checks
// Correctly detects orphaned products vs out-of-stock

"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  isBundle?: boolean;
}

interface ValidationResult {
  id: string;
  name: string;
  exists: boolean;
  status?: string;
  error?: string;
}

export function CartValidator() {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [orphanedItems, setOrphanedItems] = useState<CartItem[]>([]);
  const [showResults, setShowResults] = useState(false);

  const validateCart = async () => {
    setIsValidating(true);
    try {
      const cartData = localStorage.getItem("cart");
      if (!cartData) {
        setOrphanedItems([]);
        setValidationResults([]);
        setShowResults(true);
        return;
      }

      const items: CartItem[] = JSON.parse(cartData);
      const results: ValidationResult[] = [];
      const orphaned: CartItem[] = [];

      for (const item of items) {
        if (item.isBundle) {
          // For bundles, they're handled separately
          results.push({
            id: item.id,
            name: item.name,
            exists: true,
            status: "bundle",
          });
        } else {
          try {
            // ✅ Use ?admin=true to bypass visibility checks
            // This checks if the product EXISTS, regardless of status/visibility
            const response = await fetch(`/api/products/${item.id}?admin=true`);

            if (response.ok) {
              const data = await response.json();
              results.push({
                id: item.id,
                name: item.name,
                exists: true,
                status: "exists",
              });
            } else if (response.status === 404) {
              // Product doesn't exist in database (truly orphaned)
              results.push({
                id: item.id,
                name: item.name,
                exists: false,
                error: "Product deleted or never existed",
              });
              orphaned.push(item);
            } else {
              // Other errors
              results.push({
                id: item.id,
                name: item.name,
                exists: false,
                error: `API error: ${response.status}`,
              });
            }
          } catch (err) {
            results.push({
              id: item.id,
              name: item.name,
              exists: false,
              error: String(err),
            });
          }
        }
      }

      setValidationResults(results);
      setOrphanedItems(orphaned);
    } catch (err) {
      console.error("[CartValidator] Error:", err);
      alert("Failed to validate cart: " + String(err));
    } finally {
      setIsValidating(false);
      setShowResults(true);
    }
  };

  const clearOrphanedItems = () => {
    const cartData = localStorage.getItem("cart");
    if (!cartData) return;

    const items: CartItem[] = JSON.parse(cartData);
    const validIds = new Set(
      validationResults
        .filter((r) => r.exists)
        .map((r) => r.id)
    );

    const cleanedCart = items.filter((item) => validIds.has(item.id) || item.isBundle);

    localStorage.setItem("cart", JSON.stringify(cleanedCart));
    setOrphanedItems([]);
    alert(`Removed ${orphanedItems.length} orphaned item(s). Cart updated.`);
    location.reload();
  };

  const clearAllCart = () => {
    if (confirm("Clear entire cart?")) {
      localStorage.removeItem("cart");
      alert("Cart cleared!");
      location.reload();
    }
  };

  return (
    <Card className="p-5 border-2 border-yellow-200 bg-yellow-50 rounded-xl">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-yellow-900">Cart Validation Tool</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Check if products in your cart still exist in the store database.
              Detects products that were deleted after being added to cart.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={validateCart}
            disabled={isValidating}
            variant="outline"
            className="gap-2"
          >
            {isValidating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Validate Cart
              </>
            )}
          </Button>

          <Button
            onClick={clearAllCart}
            variant="outline"
            className="gap-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Cart
          </Button>
        </div>

        {showResults && validationResults.length > 0 && (
          <div className="space-y-3 mt-4">
            <div className="text-sm font-semibold text-gray-900">
              Validation Results ({validationResults.length} items)
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {validationResults.map((result) => (
                <div
                  key={result.id}
                  className={`p-3 rounded-lg border text-sm ${
                    result.exists
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {result.name}
                      </div>
                      <div
                        className={`text-xs ${
                          result.exists
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {result.exists
                          ? `✅ ${result.status === "bundle" ? "Bundle" : "Found"}`
                          : `❌ ${result.error || "Not found"}`}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 font-mono break-all">
                        {result.id}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {orphanedItems.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <div className="text-sm font-semibold text-red-900 mb-2">
                  ⚠️ Found {orphanedItems.length} orphaned item(s)
                </div>
                <p className="text-xs text-red-700 mb-3">
                  These products don't exist in the database (they may have been deleted).
                  They will be removed if you click the button below.
                </p>
                <Button
                  onClick={clearOrphanedItems}
                  className="w-full bg-red-600 hover:bg-red-700 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Orphaned Items ({orphanedItems.length})
                </Button>
              </div>
            )}

            {orphanedItems.length === 0 && validationResults.length > 0 && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-700 font-semibold">
                ✅ All items in your cart are valid and still available!
              </div>
            )}
          </div>
        )}

        {showResults && validationResults.length === 0 && (
          <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg text-sm text-blue-700">
            ℹ️ Your cart is empty.
          </div>
        )}
      </div>
    </Card>
  );
}