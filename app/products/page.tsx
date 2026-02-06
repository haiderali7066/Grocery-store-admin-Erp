'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/store/Navbar';
import { Footer } from '@/components/store/Footer';
import { useCart } from '@/components/cart/CartProvider';
import { ProductCard } from '@/components/store/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, X } from 'lucide-react';
import AuthProvider from '@/components/auth/AuthProvider';
import CartProvider from '@/components/cart/CartProvider';

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
  isFlashSale: boolean;
  isHot: boolean;
  isFeatured: boolean;
  images?: string[];
  mainImage?: string;
}

interface Category {
  _id: string;
  name: string;
  parent?: string;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams?.get('category') || ''
  );
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDeals, setFilterDeals] = useState<string[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('[Products] Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('[Products] Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (productId: string) => {
    console.log('[v0] Products page - Adding to cart:', productId);
    const product = products.find(p => p._id === productId);
    if (!product) {
      console.log('[v0] Product not found:', productId);
      return;
    }

    addItem({
      id: product._id,
      name: product.name,
      price: product.retailPrice,
      quantity: 1,
      weight: `${product.unitSize} ${product.unitType}`,
      discount: product.discount,
    });
    console.log('[v0] Item added to cart successfully');
  };

  const filteredProducts = products.filter((product) => {
    const matchCategory = !selectedCategory || product.category === selectedCategory;
    const matchPrice = product.retailPrice >= priceRange[0] && product.retailPrice <= priceRange[1];
    const matchSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchDeals = true;
    if (filterDeals.length > 0) {
      matchDeals =
        (filterDeals.includes('hot') && product.isHot) ||
        (filterDeals.includes('flash') && product.isFlashSale) ||
        (filterDeals.includes('featured') && product.isFeatured);
    }

    return matchCategory && matchPrice && matchSearch && matchDeals;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Products</h1>
          <p className="text-gray-600">
            Discover our wide selection of fresh, quality groceries
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters - Desktop */}
          <div className="hidden lg:block">
            <FilterSidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              filterDeals={filterDeals}
              onFilterDealsChange={setFilterDeals}
            />
          </div>

          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-6">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="w-full justify-between"
            >
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>

            {showFilters && (
              <div className="mt-4">
                <FilterSidebar
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  priceRange={priceRange}
                  onPriceChange={setPriceRange}
                  filterDeals={filterDeals}
                  onFilterDealsChange={setFilterDeals}
                />
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-6">
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No products found</p>
                <Button
                  onClick={() => {
                    setSelectedCategory('');
                    setPriceRange([0, 10000]);
                    setFilterDeals([]);
                    setSearchQuery('');
                  }}
                  variant="outline"
                >
                  Reset Filters
                </Button>
              </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} onAddToCart={handleAddToCart} />
          ))}
              </div>
            )}

            {filteredProducts.length > 0 && (
              <div className="mt-8 text-center text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FilterSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceChange,
  filterDeals,
  onFilterDealsChange,
}: {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  priceRange: number[];
  onPriceChange: (range: number[]) => void;
  filterDeals: string[];
  onFilterDealsChange: (deals: string[]) => void;
}) {
  const toggleDeal = (deal: string) => {
    if (filterDeals.includes(deal)) {
      onFilterDealsChange(filterDeals.filter((d) => d !== deal));
    } else {
      onFilterDealsChange([...filterDeals, deal]);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 sticky top-20">
      {/* Category Filter */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-3">Categories</h3>
        <div className="space-y-2">
          <button
            onClick={() => onCategoryChange('')}
            className={`block w-full text-left px-3 py-2 rounded transition ${
              !selectedCategory
                ? 'bg-green-700 text-white font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => onCategoryChange(cat._id)}
              className={`block w-full text-left px-3 py-2 rounded transition ${
                selectedCategory === cat._id
                  ? 'bg-green-700 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 mb-3">Price Range</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Min: Rs. {priceRange[0]}</label>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={priceRange[0]}
              onChange={(e) => onPriceChange([parseInt(e.target.value), priceRange[1]])}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Max: Rs. {priceRange[1]}</label>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={priceRange[1]}
              onChange={(e) => onPriceChange([priceRange[0], parseInt(e.target.value)])}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Deals Filter */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Special Offers</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterDeals.includes('hot')}
              onChange={() => toggleDeal('hot')}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Hot Products</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterDeals.includes('flash')}
              onChange={() => toggleDeal('flash')}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Flash Sales</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterDeals.includes('featured')}
              onChange={() => toggleDeal('featured')}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Featured</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default ProductsContent;
