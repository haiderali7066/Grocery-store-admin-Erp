"use client";

import { Navbar } from "@/components/store/Navbar";
import { HeroCarousel } from "@/components/store/HeroCarousel";
import { FeaturedProducts } from "@/components/store/FeaturedProducts";
import { Footer } from "@/components/store/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Truck,
  Shield,
  Clock,
  Leaf,
  Star,
  TrendingUp,
  Package,
  Award,
  Users,
  Heart,
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
  isVisible: boolean;
  sortOrder: number;
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        // Only show visible categories
        setCategories(data.categories.filter((cat: Category) => cat.isVisible));
      } else {
        console.error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <HeroCarousel />
        </section>

        {/* Features Section */}
        <section className="bg-secondary/30 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Truck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-2">
                  Free Delivery
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  On orders over Rs. 2000
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Leaf className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-2">
                  100% Fresh
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Farm-fresh quality guaranteed
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-2">
                  Secure Payment
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  100% secure transactions
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-2">
                  24/7 Support
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Always here to help
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Categories */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Shop by Category
            </h2>
            <p className="text-muted-foreground text-lg">
              Explore our wide range of fresh products
            </p>
          </div>

          {loadingCategories ? (
            <p className="text-center text-gray-500">Loading categories...</p>
          ) : categories.length === 0 ? (
            <p className="text-center text-gray-500">No categories available</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {categories.map((category) => (
                <Link
                  key={category._id}
                  href={`/products?category=${category.name}`}
                  className="group"
                >
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-500 hover:shadow-lg transition-all hover:scale-105 cursor-pointer aspect-square">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
                      {category.icon
                        ? category.icon
                        : category.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-semibold text-sm md:text-base text-center">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Featured Products */}
        <FeaturedProducts />

        {/* Why Choose Us Section */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Why Choose Khas Pure Food?
            </h2>
            <p className="text-muted-foreground text-lg">
              Your trusted partner for quality groceries
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Premium Quality</h3>
              <p className="text-muted-foreground text-sm">
                Handpicked products meeting highest standards
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Careful Packaging</h3>
              <p className="text-muted-foreground text-sm">
                Products packed with care to ensure freshness
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">10,000+ Customers</h3>
              <p className="text-muted-foreground text-sm">
                Join our growing family of satisfied shoppers
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Customer First</h3>
              <p className="text-muted-foreground text-sm">
                Your satisfaction is our top priority
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-center text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Shopping?
            </h2>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Explore thousands of fresh products at your fingertips
            </p>
            <Button
              asChild
              size="lg"
              className="bg-white text-primary hover:bg-gray-100 text-lg px-10 py-6 rounded-full font-bold"
            >
              <Link href="/products">Browse All Products</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
