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
  ArrowRight,
  Star,
} from "lucide-react";

interface Category {
  _id: string;
  name: string;
  isVisible: boolean;
  sortOrder: number;
  icon?: string;
}

function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const CATEGORY_GRADIENTS = [
  "from-green-500 to-emerald-600",
  "from-orange-400 to-orange-500",
  "from-green-400 to-teal-500",
  "from-amber-400 to-orange-400",
  "from-emerald-500 to-green-600",
  "from-orange-500 to-amber-500",
  "from-teal-400 to-green-500",
  "from-lime-400 to-green-500",
];

const CATEGORY_ICON_BG = [
  "bg-green-50",
  "bg-orange-50",
  "bg-emerald-50",
  "bg-amber-50",
  "bg-teal-50",
  "bg-lime-50",
  "bg-green-50",
  "bg-orange-50",
];

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/admin/categories");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
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
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Nunito:wght@300;400;500;600;700&display=swap');

        :root {
          --green-primary: #16A34A;
          --green-dark: #15803D;
          --green-light: #F0FDF4;
          --orange-primary: #EA580C;
          --orange-light: #FFF7ED;
          --orange-accent: #F97316;
        }

        .font-display { font-family: 'Playfair Display', Georgia, serif; }
        .font-body { font-family: 'Nunito', system-ui, sans-serif; }

        body { font-family: 'Nunito', system-ui, sans-serif; }

        .section-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 100px;
          margin-bottom: 12px;
        }
        .section-pill-green {
          background: #DCFCE7;
          color: #15803D;
        }
        .section-pill-orange {
          background: #FFEDD5;
          color: #C2410C;
        }

        .category-card {
          transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
        }
        .category-card:hover {
          transform: translateY(-8px) scale(1.04);
          box-shadow: 0 24px 48px -12px rgba(22,163,74,0.25);
        }

        .feature-pill {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .feature-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -6px rgba(0,0,0,0.1);
        }

        .why-card {
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .why-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px -10px rgba(22,163,74,0.18);
        }

        .cta-bg {
          background: linear-gradient(135deg, #15803D 0%, #16A34A 40%, #22C55E 70%, #86EFAC 100%);
          position: relative;
          overflow: hidden;
        }
        .cta-bg::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 240px; height: 240px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
        }
        .cta-bg::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -40px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }

        .stats-strip {
          background: linear-gradient(90deg, #EA580C 0%, #F97316 50%, #EA580C 100%);
          background-size: 200% 100%;
          animation: shimmer-strip 4s ease infinite;
        }
        @keyframes shimmer-strip {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .skeleton-box {
          animation: skeleton 1.4s ease-in-out infinite;
          background: linear-gradient(90deg, #F0FDF4 25%, #DCFCE7 50%, #F0FDF4 75%);
          background-size: 200% 100%;
        }
        @keyframes skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .orange-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--orange-primary);
          display: inline-block;
          margin-right: 8px;
        }
      `}</style>

      <Navbar />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <HeroCarousel />
        </section>

        {/* ── Features Strip ── */}
        <section className="border-y border-green-100 bg-green-50/50 py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                {
                  icon: Truck,
                  title: "Free Delivery",
                  desc: "On orders over Rs. 2,000",
                  iconBg: "bg-green-100",
                  iconColor: "text-green-700",
                },
                {
                  icon: Leaf,
                  title: "100% Fresh",
                  desc: "Farm-fresh guaranteed",
                  iconBg: "bg-green-100",
                  iconColor: "text-green-700",
                },
                {
                  icon: Shield,
                  title: "Secure Payment",
                  desc: "Safe transactions",
                  iconBg: "bg-orange-100",
                  iconColor: "text-orange-600",
                },
                {
                  icon: Clock,
                  title: "24/7 Support",
                  desc: "Always here to help",
                  iconBg: "bg-orange-100",
                  iconColor: "text-orange-600",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="feature-pill flex flex-col sm:flex-row items-center sm:items-start gap-3 p-4 bg-white rounded-2xl border border-green-100"
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center`}
                  >
                    <f.icon className={`h-5 w-5 ${f.iconColor}`} />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="font-semibold text-sm text-gray-800 leading-tight">
                      {f.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-10">
            <div>
              <span className="section-pill section-pill-green">
                <Star className="w-3 h-3" /> Categories
              </span>
              <h2 className="font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-gray-900 leading-tight">
                Shop by Category
              </h2>
              <p className="text-gray-500 text-base mt-2">
                Explore our wide range of fresh products
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-green-700 font-semibold text-sm hover:text-orange-600 transition-colors group"
            >
              View all products
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loadingCategories ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl skeleton-box"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-red-500 font-semibold">{error}</p>
              <p className="text-gray-400 text-sm mt-1">
                Please try refreshing the page
              </p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No categories available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
              {categories.map((category, idx) => {
                const gradient =
                  CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length];
                const iconBg = CATEGORY_ICON_BG[idx % CATEGORY_ICON_BG.length];
                const hasUrlIcon = category.icon && isUrl(category.icon);
                const hasEmojiIcon =
                  category.icon &&
                  !isUrl(category.icon) &&
                  category.icon.trim().length > 0;

                return (
                  <Link
                    key={category._id}
                    href={`/products?category=${encodeURIComponent(category.name)}`}
                    className="category-card group block"
                  >
                    <div
                      className={`relative flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br ${gradient} aspect-square overflow-hidden cursor-pointer`}
                    >
                      {/* Decorative blobs */}
                      <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
                      <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />

                      {/* Icon */}
                      <div
                        className={`relative w-14 h-14 ${iconBg} rounded-2xl shadow flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}
                      >
                        {hasUrlIcon ? (
                          <img
                            src={category.icon}
                            alt={category.name}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              t.style.display = "none";
                              const p = t.parentElement;
                              if (p)
                                p.innerHTML = `<span style="font-size:1.25rem;font-weight:700;color:#555">${category.name.charAt(0).toUpperCase()}</span>`;
                            }}
                          />
                        ) : hasEmojiIcon ? (
                          <span
                            className="text-2xl leading-none"
                            role="img"
                            aria-label={category.name}
                          >
                            {category.icon}
                          </span>
                        ) : (
                          <span className="text-xl font-bold text-gray-600 font-display">
                            {category.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="relative text-xs md:text-sm font-bold text-white text-center leading-snug drop-shadow px-1 line-clamp-2">
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Featured Products ── */}
        <FeaturedProducts />

        {/* ── Stats Strip ── */}
        <section className="stats-strip py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
              {[
                { value: "10,000+", label: "Happy Customers" },
                { value: "500+", label: "Products" },
                { value: "50+", label: "Trusted Brands" },
                { value: "4.9 ★", label: "Average Rating" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-display text-2xl md:text-3xl font-bold">
                    {s.value}
                  </div>
                  <div className="text-white/80 text-sm mt-1 font-medium">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Choose Us ── */}
        <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="section-pill section-pill-orange">
              <Heart className="w-3 h-3" /> Our Promise
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-gray-900 leading-tight">
              Why Choose Khas Pure Food?
            </h2>
            <p className="text-gray-500 text-base mt-3 max-w-md mx-auto">
              Your trusted partner for quality groceries delivered with care
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Award,
                title: "Premium Quality",
                desc: "Handpicked products meeting the highest purity standards",
                accent: "#16A34A",
                bg: "bg-green-50",
                border: "border-green-100",
              },
              {
                icon: Package,
                title: "Careful Packaging",
                desc: "Products packed with care to ensure maximum freshness",
                accent: "#EA580C",
                bg: "bg-orange-50",
                border: "border-orange-100",
              },
              {
                icon: Users,
                title: "10,000+ Customers",
                desc: "Join our growing family of satisfied, loyal shoppers",
                accent: "#16A34A",
                bg: "bg-green-50",
                border: "border-green-100",
              },
              {
                icon: Heart,
                title: "Customer First",
                desc: "Your satisfaction isn't just our goal — it's our guarantee",
                accent: "#EA580C",
                bg: "bg-orange-50",
                border: "border-orange-100",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`why-card p-6 rounded-2xl ${item.bg} border ${item.border}`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: item.accent }}
                >
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pb-16 md:pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="cta-bg rounded-3xl p-8 md:p-14 text-center text-white relative">
              <div className="relative z-10">
                <span className="inline-block bg-white/20 text-white text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-6">
                  🛒 Start Shopping
                </span>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                  Ready to Start Shopping?
                </h2>
                <p className="text-white/80 text-base md:text-lg mb-8 max-w-md mx-auto">
                  Explore thousands of fresh products — from farm to your
                  doorstep
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    asChild
                    size="lg"
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all border-0"
                  >
                    <Link href="/products" className="flex items-center gap-2">
                      Browse All Products <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-white/40 text-white hover:bg-white/10 font-semibold text-base px-8 py-6 rounded-full bg-transparent"
                  >
                    <Link href="/products?featured=true">View Deals</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
