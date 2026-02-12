"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { useCart } from "@/components/cart/CartProvider";
import { ProductCard } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider"; // Assuming you have shadcn slider, or use standard input
import {
  ChevronDown,
  SlidersHorizontal,
  X,
  Search,
  Loader2,
} from "lucide-react";

// --- Types ---
interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  retailPrice: number;
  discount: number;
  unitSize: number;
  unitType: string;
  category: Category | string; // Handle both populated object or ID string
  isFlashSale: boolean;
  isHot: boolean;
  isFeatured: boolean;
  images?: string[];
  mainImage?: string;
  stock: number;
}

// --- Main Component ---
export default function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams?.get("category") || "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedPrice, setDebouncedPrice] = useState<[number, number]>([
    0, 10000,
  ]);

  // --- Effects ---

  // 1. Fetch Categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to fetch categories");
      }
    };
    fetchCategories();
  }, []);

  // 2. Debounce Search and Price input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setDebouncedPrice(priceRange);
    }, 500); // 500ms delay
    return () => clearTimeout(timer);
  }, [searchQuery, priceRange]);

  // 3. Fetch Products when Filters Change
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // Construct Query Params
        const params = new URLSearchParams();
        if (selectedCategory) params.append("category", selectedCategory);
        if (debouncedSearch) params.append("search", debouncedSearch);
        params.append("minPrice", debouncedPrice[0].toString());
        params.append("maxPrice", debouncedPrice[1].toString());

        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, debouncedSearch, debouncedPrice]);

  // --- Handlers ---
  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;
    addItem({
      id: product._id,
      name: product.name,
      price: product.retailPrice,
      quantity: 1,
      weight: `${product.unitSize} ${product.unitType}`,
      discount: product.discount,
    });
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSearchQuery("");
    setPriceRange([0, 10000]);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-gray-500 mt-1">
              Found {products.length} items for you
            </p>
          </div>

          {/* Mobile Filter Toggle */}
          <Button
            variant="outline"
            className="lg:hidden flex items-center gap-2"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Desktop (Sticky) & Mobile (Overlay) */}
          <aside
            className={`
            fixed inset-0 z-40 bg-white p-6 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block lg:w-64 lg:p-0 lg:bg-transparent lg:z-auto
            ${showMobileFilters ? "translate-x-0" : "-translate-x-full"}
          `}
          >
            {/* Mobile Close Button */}
            <div className="flex justify-between items-center lg:hidden mb-6">
              <h2 className="text-xl font-bold">Filters</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileFilters(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-8 sticky top-24">
              {/* Search */}
              <div className="relative">
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">
                  Categories
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                  <button
                    onClick={() => setSelectedCategory("")}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      !selectedCategory
                        ? "bg-black text-white"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat._id}
                      onClick={() => setSelectedCategory(cat._id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === cat._id
                          ? "bg-black text-white"
                          : "text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">
                  Price Range
                </h3>
                <div className="px-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-4">
                    <span>Rs. {priceRange[0]}</span>
                    <span>Rs. {priceRange[1]}</span>
                  </div>
                  {/* Standard Range Input fallback if no Slider component */}
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], parseInt(e.target.value)])
                    }
                    className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={clearFilters}
              >
                Reset Filters
              </Button>
            </div>
          </aside>

          {/* Overlay for mobile sidebar */}
          {showMobileFilters && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setShowMobileFilters(false)}
            />
          )}

          {/* Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading fresh products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg mb-4">
                  No products found matching your criteria.
                </p>
                <Button onClick={clearFilters}>Clear all filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onAddToCart={() => handleAddToCart(product._id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
