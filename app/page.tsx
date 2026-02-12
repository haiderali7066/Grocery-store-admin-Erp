"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/store/Navbar";
import { HeroCarousel } from "@/components/store/HeroCarousel";
import { FeaturedProducts } from "@/components/store/FeaturedProducts";
import { Footer } from "@/components/store/Footer";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Shield,
  Clock,
  Leaf,
  Award,
  Package,
  Users,
  Heart,
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
  isVisible: boolean;
  sortOrder: number;
  icon?: string; // optional icon string
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/admin/categories"); // public GET route
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data.categories)) {
          setCategories(data.categories); // only visible categories come from API
        } else {
          throw new Error("Invalid categories format");
        }
      } catch (err: any) {
        console.error("Error fetching categories:", err);
        setError("Failed to fetch categories");
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

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
              {[
                {
                  icon: Truck,
                  title: "Free Delivery",
                  desc: "On orders over Rs. 2000",
                },
                {
                  icon: Leaf,
                  title: "100% Fresh",
                  desc: "Farm-fresh quality guaranteed",
                },
                {
                  icon: Shield,
                  title: "Secure Payment",
                  desc: "100% secure transactions",
                },
                {
                  icon: Clock,
                  title: "24/7 Support",
                  desc: "Always here to help",
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center p-4"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm md:text-base mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              ))}
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
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : categories.length === 0 ? (
            <p className="text-center text-gray-500">No categories available</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {categories.map((category) => (
                <Link
                  key={category._id}
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  className="group"
                >
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-500 hover:shadow-lg transition-all hover:scale-105 cursor-pointer aspect-square">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
                      {category.icon ? (
                        <img
                          src={category.icon}
                          alt={category.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        category.name.charAt(0).toUpperCase()
                      )}
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
            {[
              {
                icon: Award,
                title: "Premium Quality",
                desc: "Handpicked products meeting highest standards",
              },
              {
                icon: Package,
                title: "Careful Packaging",
                desc: "Products packed with care to ensure freshness",
              },
              {
                icon: Users,
                title: "10,000+ Customers",
                desc: "Join our growing family of satisfied shoppers",
              },
              {
                icon: Heart,
                title: "Customer First",
                desc: "Your satisfaction is our top priority",
              },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
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
