"use client";

import Link from "next/link";
import { useState } from "react";
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

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 w-full bg-background shadow-sm">
      {/* Top Info Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-between items-center py-2 text-xs md:text-sm gap-2">
            {/* Left side - Contact Info */}
            <div className="flex flex-wrap items-center gap-3 md:gap-6">
              <a
                href="tel:+923001234567"
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">+92 300 1234567</span>
              </a>
              <a
                href="mailto:info@khaspurefood.com"
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <Mail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden md:inline">info@khaspurefood.com</span>
              </a>
              <div className="hidden lg:flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Mon-Sat: 8AM - 10PM</span>
              </div>
            </div>

            {/* Right side - Location/Links */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="hidden md:flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>Lahore, Pakistan</span>
              </div>
              <Link
                href="/track-order"
                className="hover:opacity-80 transition-opacity"
              >
                Track Order
              </Link>
              <Link
                href="/help"
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
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                KPF
              </div>
              <span className="hidden sm:inline">Khas Pure Food</span>
            </Link>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full bg-secondary border-0 pl-4 pr-10"
                />
                <Search className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              <Link
                href="/products"
                className="text-foreground hover:text-primary font-medium text-sm transition-colors"
              >
                Products
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-foreground hover:text-primary font-medium text-sm transition-colors">
                    Categories
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 rounded-2xl">
                  <DropdownMenuItem asChild>
                    <Link href="/products?category=vegetables">Vegetables</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/products?category=fruits">Fruits</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/products?category=dairy">Dairy</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/products?category=grains">Grains</Link>
                  </DropdownMenuItem>
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
              <div className="py-3">
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="mb-3 rounded-full bg-secondary border-0"
                />
              </div>
              <Link
                href="/products"
                className="block py-2 text-foreground hover:text-primary transition-colors"
              >
                Products
              </Link>
              <Link
                href="/cart"
                className="block py-2 text-foreground hover:text-primary transition-colors relative"
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
                  >
                    My Account
                  </Link>
                  <Link
                    href="/orders"
                    className="block py-2 text-foreground hover:text-primary transition-colors"
                  >
                    My Orders
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      className="block py-2 text-foreground hover:text-primary transition-colors"
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="block w-full text-left py-2 text-foreground hover:text-primary transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full mb-2 py-2 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all font-medium text-sm">
                    <Link href="/login">Login</Link>
                  </button>
                  <button className="w-full py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all font-medium text-sm">
                    <Link href="/signup">Sign Up</Link>
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
