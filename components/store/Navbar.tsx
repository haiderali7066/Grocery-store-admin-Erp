"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
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
  MapPin,
  Clock,
} from "lucide-react";

interface StoreSettings {
  storeName?: string;
  storeLogoUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  country?: string;
  businessHours?: string;
  whatsappNumber?: string;
}

// Ensure you match this to your actual category structure from the DB
interface Category {
  _id: string; // or id: string
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
    // Fetch Settings
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings ?? null))
      .catch(console.error);

    // Fetch Categories (Adjust the endpoint if your API path is different)
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        // Checks if API returns an array directly, or an object like { categories: [...] }
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
      setIsMenuOpen(false); // Close mobile menu if open
      setSearchQuery(""); // Optional: clear search after submitting
    }
  };

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const phoneHref = settings?.contactPhone
    ? `tel:${settings.contactPhone.replace(/\s/g, "")}`
    : "tel:+923001234567";
  const phoneDisplay = settings?.contactPhone ?? "";

  const emailHref = settings?.contactEmail
    ? `mailto:${settings.contactEmail}`
    : "mailto:info@khaspurefood.com";
  const emailDisplay = settings?.contactEmail ?? "";

  const locationDisplay =
    [settings?.city, settings?.country].filter(Boolean).join(", ") ||
    "";

  const hoursDisplay = settings?.businessHours ?? "";

  return (
    <nav className="sticky top-0 z-50 w-full bg-background shadow-sm">
      {/* Top Info Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-between items-center py-2 text-xs md:text-sm gap-2">
            {/* Left side - Contact Info */}
            <div className="flex flex-wrap items-center gap-3 md:gap-6">
              <a
                href={phoneHref}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{phoneDisplay}</span>
              </a>
              <a
                href={emailHref}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <Mail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden md:inline">{emailDisplay}</span>
              </a>
              {hoursDisplay && (
                <div className="hidden lg:flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{hoursDisplay}</span>
                </div>
              )}
            </div>

            {/* Right side - Location / Links */}
            <div className="flex items-center gap-3 md:gap-4">
              {locationDisplay && (
                <div className="hidden md:flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{locationDisplay}</span>
                </div>
              )}
              <Link
                href="/orders"
                className="hover:opacity-80 transition-opacity"
              >
                Track Order
              </Link>
              <Link
                href="/about"
                className="hover:opacity-80 transition-opacity hidden sm:inline"
              >
                Help
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="border-b border-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 text-lg md:text-xl font-bold text-primary"
            >
              {settings?.storeLogoUrl ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={settings.storeLogoUrl}
                    alt={settings?.storeName ?? "Store logo"}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {(settings?.storeName ?? "")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 3)
                    .toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline">
                {settings?.storeName ?? ""}
              </span>
            </Link>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="relative w-full">
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full bg-secondary border-0 pl-4 pr-10"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
              </form>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              <Link
                href="/"
                className="text-foreground hover:text-primary font-medium text-sm transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="text-foreground hover:text-primary font-medium text-sm transition-colors"
              >
                Products
              </Link>
              <Link
                href="/sale"
                className="text-foreground hover:text-primary font-medium text-sm transition-colors"
              >
                Sale
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-foreground hover:text-primary font-medium text-sm transition-colors">
                    Categories
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 rounded-2xl">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <DropdownMenuItem key={cat._id || cat.slug} asChild>
                        <Link
                          href={`/products?category=${cat.slug || cat.name.toLowerCase()}`}
                        >
                          {cat.name}
                        </Link>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      No categories found
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                href="/cart"
                className="relative p-2 rounded-full hover:bg-secondary transition-colors group"
              >
                <ShoppingCart className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
                {cartItemCount > 0 && (
                  <span className="absolute top-0 right-0 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </Link>

              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-muted transition-colors text-sm font-medium">
                      <User className="h-4 w-4" />
                      {user.name.split(" ")[0]}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-2xl">
                    <DropdownMenuItem asChild>
                      <Link href="/account">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders">My Orders</Link>
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin Panel</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <button className="px-5 py-2 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all text-sm font-medium">
                    <Link href="/login">Login</Link>
                  </button>
                  <button className="px-5 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all text-sm font-medium">
                    <Link href="/signup">Sign Up</Link>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden pb-4 border-t border-secondary">
              <form onSubmit={handleSearch} className="py-3 relative">
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-3 rounded-full bg-secondary border-0 pr-10"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-5 text-muted-foreground"
                >
                  <Search className="h-5 w-5" />
                </button>
              </form>
              <Link
                href="/"
                className="block py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/products"
                className="block py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Products
              </Link>
              <Link
                href="/sale"
                className="block py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sale
              </Link>
             

              <div className="py-2">
                <span className="block font-medium mb-1 text-muted-foreground text-sm">
                  Categories
                </span>
                <div className="pl-4 space-y-2">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <Link
                        key={cat._id || cat.slug}
                        href={`/products?category=${cat.slug || cat.name.toLowerCase()}`}
                        className="block text-foreground hover:text-primary transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {cat.name}
                      </Link>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Loading...
                    </span>
                  )}
                </div>
              </div>

              <Link
                href="/cart"
                className="block py-2 text-foreground hover:text-primary transition-colors relative"
                onClick={() => setIsMenuOpen(false)}
              >
                Cart{" "}
                {cartItemCount > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </Link>
              {isAuthenticated && user ? (
                <>
                  <Link
                    href="/account"
                    className="block py-2 text-foreground hover:text-primary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Account
                  </Link>
                  <Link
                    href="/orders"
                    className="block py-2 text-foreground hover:text-primary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      className="block py-2 text-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-foreground hover:text-primary transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full mb-2 py-2 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all font-medium text-sm">
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                      Login
                    </Link>
                  </button>
                  <button className="w-full py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all font-medium text-sm">
                    <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                      Sign Up
                    </Link>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
