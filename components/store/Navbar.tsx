"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  LogOut,
  User,
  Phone,
  ChevronDown,
  AlignLeft,
  ShoppingBag
} from "lucide-react";

interface StoreSettings {
  storeName?: string;
  storeLogoUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export function Navbar() {
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const { user, logout, isAuthenticated } = useAuth();
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings ?? null))
      .catch(console.error);

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else if (data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMenuOpen(false);
      setSearchQuery(""); 
    }
  };

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const phoneHref = settings?.contactPhone
    ? `tel:${settings.contactPhone.replace(/\s/g, "")}`
    : "tel:+923001234567";
  const phoneDisplay = settings?.contactPhone ?? "+92 300 123 4567";

  return (
    <header className="w-full bg-white flex flex-col shadow-sm sticky top-0 z-50">
      {/* Tier 1: Top Green Bar */}
      <div className="bg-green-700 text-white w-full transition-colors">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-2 text-[11px] sm:text-xs font-medium tracking-wide">
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline bg-green-600/50 px-2 py-0.5 rounded-full">
              Free Delivery on orders over Rs. 5000
            </span>
            <a href={phoneHref} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="h-3 w-3" /> {phoneDisplay}
            </a>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
            <Link href="/orders" className="hover:text-white transition-colors  sm:inline-block">Track Order</Link>
          </div>
        </div>
      </div>

      {/* Tier 2: Main Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 md:gap-8">
          
          {/* Logo & Store Name Combo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
            {settings?.storeLogoUrl && (
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform duration-300">
                <Image
                  src={settings.storeLogoUrl}
                  alt={settings?.storeName ?? "Store logo"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 40px, 48px"
                />
              </div>
            )}
            <span className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight group-hover:text-green-700 transition-colors">
              {settings?.storeName ?? "Devntom"}
            </span>
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-auto">
            <form 
              onSubmit={handleSearch} 
              className="flex w-full group relative rounded-lg overflow-hidden border border-gray-300 focus-within:border-green-600 focus-within:ring-4 focus-within:ring-green-600/10 transition-all"
            >
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">
                <Search className="h-5 w-5" />
              </div>
              <Input
                type="search"
                placeholder="Search for products, brands and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 font-medium transition-colors border-l border-green-600"
              >
                Search
              </button>
            </form>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-8 flex-shrink-0">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none">
                    <div className="bg-green-50 p-2 rounded-full border border-green-100 text-green-700">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">Welcome</p>
                      <p className="font-bold text-gray-800 text-sm leading-tight">{user.name.split(" ")[0]}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl shadow-lg border-gray-100">
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer"><Link href="/account">My Account</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer"><Link href="/orders">My Orders</Link></DropdownMenuItem>
                  {user.role === "admin" && (
                     <DropdownMenuItem asChild className="rounded-lg cursor-pointer"><Link href="/admin">Admin Panel</Link></DropdownMenuItem>
                  )}
                  <div className="h-px bg-gray-100 my-1"></div>
                  <DropdownMenuItem onClick={logout} className="text-red-600 rounded-lg cursor-pointer hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                 <div className="bg-gray-50 hover:bg-gray-100 p-2 rounded-full border border-gray-200 transition-colors">
                    <User className="h-5 w-5 text-gray-600" />
                 </div>
                 <div className="text-left">
                    <p className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">Sign In</p>
                    <p className="font-bold text-gray-800 text-sm leading-tight">Account</p>
                 </div>
              </Link>
            )}

            <Link href="/cart" className="flex items-center gap-3 group">
              <div className="relative bg-gray-50 group-hover:bg-green-50 p-2.5 rounded-full border border-gray-200 group-hover:border-green-200 transition-all">
                <ShoppingBag className="h-5 w-5 text-gray-700 group-hover:text-green-700" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm transform group-hover:scale-110 transition-transform">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </div>
              <span className="font-bold text-gray-800 hidden lg:inline group-hover:text-green-700 transition-colors">
                Rs. 0.00 {/* Optional: Replace with actual cart total if you have it */}
              </span>
            </Link>
          </div>

          {/* Mobile Actions (Visible on small screens) */}
          <div className="flex md:hidden items-center gap-4">
            <Link href="/cart" className="relative p-2 text-gray-700 hover:text-green-600 transition-colors">
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </Link>
            <button 
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 3: Bottom Navigation Links (Desktop) */}
      <div className="hidden md:block bg-white shadow-sm relative z-10 border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-8 h-12">
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-green-600 text-white px-4 h-full font-medium hover:bg-green-700 transition-colors">
                <AlignLeft className="h-4 w-4" />
                Browse Categories
                <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2 rounded-xl mt-1 shadow-xl border-gray-100">
              {categories.map((cat) => (
                <DropdownMenuItem key={cat._id || cat.slug} asChild className="rounded-lg cursor-pointer">
                  <Link href={`/products?category=${cat._id}`} className="py-2.5 px-3 font-medium text-gray-700 hover:text-green-700 hover:bg-green-50 transition-colors">
                    {cat.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <nav className="flex items-center gap-8 text-sm font-bold text-gray-600">
            <Link href="/" className="hover:text-green-700 transition-colors">Home</Link>
            <Link href="/products" className="hover:text-green-700 transition-colors">All Products</Link>
            <Link href="/sale" className="text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors">
              Sale Offers
              <span className="flex h-2 w-2 relative ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </Link>
            <Link href="/bundles" className="hover:text-green-700 transition-colors">Bundles</Link>
          </nav>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-6 shadow-xl absolute top-full left-0 w-full animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSearch} className="flex w-full relative mb-6">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="h-5 w-5" />
            </div>
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-6 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-1 focus-visible:ring-green-600"
            />
          </form>
          
          <nav className="flex flex-col space-y-1">
            <Link href="/" className="px-4 py-3 text-base font-bold text-gray-800 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link href="/products" className="px-4 py-3 text-base font-bold text-gray-800 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>All Products</Link>
            <Link href="/sale" className="px-4 py-3 text-base font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex justify-between items-center" onClick={() => setIsMenuOpen(false)}>
              Sale Offers
              <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Hot</span>
            </Link>
            
            <div className="pt-4 mt-2 border-t border-gray-100">
              <p className="px-4 text-gray-400 mb-2 text-xs font-bold uppercase tracking-wider">Categories</p>
              {categories.map((cat) => (
                <Link key={cat._id} href={`/products?category=${cat._id}`} className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                  {cat.name}
                </Link>
              ))}
            </div>

            <div className="pt-4 mt-2 border-t border-gray-100">
              {isAuthenticated && user ? (
                 <>
                   <Link href="/account" className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>My Account</Link>
                   <Link href="/orders" className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                   <button onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center">
                     <LogOut className="h-4 w-4 mr-2" /> Logout
                   </button>
                 </>
              ) : (
                <Link href="/login" className="block px-4 py-3 text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-center mt-2 transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Log In / Register
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}