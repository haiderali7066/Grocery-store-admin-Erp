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
  Mail,
  ChevronDown,
  AlignLeft
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
  const phoneDisplay = settings?.contactPhone ?? "";

  return (
    <header className="w-full bg-white flex flex-col shadow-sm sticky top-0 z-50">
      {/* Tier 1: Top Green Bar */}
      <div className="bg-green-600 text-white w-full">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-1.5 text-xs">
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">Free Delivery on orders over Rs. 5000</span>
            <a href={phoneHref} className="flex items-center gap-1 hover:text-green-200">
              <Phone className="h-3 w-3" /> {phoneDisplay}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-green-200">About Us</Link>
            <Link href="/contact" className="hover:text-green-200">Contact Us</Link>
            <Link href="/orders" className="hover:text-green-200">Track Order</Link>
          </div>
        </div>
      </div>

      {/* Tier 2: Main Header with Search */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4 md:gap-8">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            {settings?.storeLogoUrl ? (
              <div className="relative w-32 h-10">
                <Image
                  src={settings.storeLogoUrl}
                  alt={settings?.storeName ?? "Store logo"}
                  fill
                  className="object-contain object-left"
                />
              </div>
            ) : (
              <span className="text-2xl font-extrabold text-green-700 tracking-tight">
                {settings?.storeName ?? "GreenValley"}
              </span>
            )}
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <form onSubmit={handleSearch} className="flex w-full">
              <Input
                type="search"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-r-none border-green-600 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-r-md flex items-center justify-center transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:text-green-600 transition-colors">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <User className="h-5 w-5 text-gray-700" />
                    </div>
                    <div className="text-left text-sm">
                      <p className="text-gray-500 text-xs">Welcome</p>
                      <p className="font-semibold text-gray-800">{user.name.split(" ")[0]}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild><Link href="/account">My Account</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/orders">My Orders</Link></DropdownMenuItem>
                  {user.role === "admin" && (
                     <DropdownMenuItem asChild><Link href="/admin">Admin Panel</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className="flex items-center gap-2 hover:text-green-600 transition-colors">
                 <div className="bg-gray-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-gray-700" />
                 </div>
                 <div className="text-left text-sm">
                    <p className="font-semibold text-gray-800">Login / Register</p>
                 </div>
              </Link>
            )}

            <Link href="/cart" className="flex items-center gap-2 group">
              <div className="relative bg-green-50 p-2 rounded-full group-hover:bg-green-100 transition-colors">
                <ShoppingCart className="h-5 w-5 text-green-700" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              </div>
              <span className="font-semibold text-gray-800 hidden lg:inline">Cart</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Tier 3: Bottom Navigation Links (Desktop) */}
      <div className="hidden md:block border-b border-gray-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-8 h-12">
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-gray-800 font-semibold hover:text-green-600 h-full border-b-2 border-transparent hover:border-green-600 transition-all">
                <AlignLeft className="h-4 w-4" />
                Shop Categories
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-md">
              {categories.map((cat) => (
                <DropdownMenuItem key={cat._id || cat.slug} asChild>
                  <Link href={`/products?category=${cat._id}`} className="cursor-pointer py-2">
                    {cat.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-6 text-sm font-medium text-gray-700">
            <Link href="/" className="hover:text-green-600 transition-colors">Home</Link>
            <Link href="/products" className="hover:text-green-600 transition-colors">All Products</Link>
            <Link href="/sale" className="text-red-600 hover:text-red-700 font-bold transition-colors">Sale Offers</Link>
            <Link href="/bundles" className="hover:text-green-600 transition-colors">Bundles</Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-4 shadow-lg absolute top-full left-0 w-full">
          <form onSubmit={handleSearch} className="flex w-full">
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-r-none border-green-600"
              />
              <button type="submit" className="bg-green-600 text-white px-4 rounded-r-md">
                <Search className="h-5 w-5" />
              </button>
          </form>
          
          <div className="flex flex-col space-y-3 text-sm font-medium text-gray-800">
             <Link href="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
             <Link href="/products" onClick={() => setIsMenuOpen(false)}>Products</Link>
             <Link href="/sale" className="text-red-600" onClick={() => setIsMenuOpen(false)}>Sale Offers</Link>
             <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-500 mb-2 text-xs uppercase tracking-wider">Categories</p>
                {categories.map((cat) => (
                  <Link key={cat._id} href={`/products?category=${cat._id}`} className="block py-1 hover:text-green-600" onClick={() => setIsMenuOpen(false)}>
                    {cat.name}
                  </Link>
                ))}
             </div>
          </div>
        </div>
      )}
    </header>
  );
}