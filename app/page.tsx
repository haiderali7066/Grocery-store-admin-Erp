import { Navbar } from "@/components/store/Navbar";
import { HeroCarousel } from "@/components/store/HeroCarousel";
// import { BundlesSection } from "@/components/store/BundlesSection";
import { FeaturedProducts } from "@/components/store/FeaturedProducts";
import { Footer } from "@/components/store/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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

export default function Home() {
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {[
              {
                name: "Vegetables",
                image: "🥬",
                link: "/products?category=vegetables",
                color: "bg-green-100",
              },
              {
                name: "Fruits",
                image: "🍎",
                link: "/products?category=fruits",
                color: "bg-red-100",
              },
              {
                name: "Dairy",
                image: "🥛",
                link: "/products?category=dairy",
                color: "bg-blue-100",
              },
              {
                name: "Meat",
                image: "🥩",
                link: "/products?category=meat",
                color: "bg-red-200",
              },
              {
                name: "Grains",
                image: "🌾",
                link: "/products?category=grains",
                color: "bg-amber-100",
              },
              {
                name: "Bakery",
                image: "🍞",
                link: "/products?category=bakery",
                color: "bg-orange-100",
              },
            ].map((category) => (
              <Link key={category.name} href={category.link} className="group">
                <div className="flex flex-col items-center p-6 rounded-2xl bg-orange-500 hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
                  <div
                    className={`w-20 h-20 ${category.color} rounded-full flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform`}
                  >
                    {category.image}
                  </div>
                  <h3 className="font-semibold text-sm md:text-base">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Bundles Section */}
        {/* <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BundlesSection />
        </section> */}

        {/* Featured Products */}
        <FeaturedProducts />

        {/* Testimonials */}
        {/* <section className="py-16 bg-secondary/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                What Our Customers Say
              </h2>
              <p className="text-muted-foreground text-lg">
                Trusted by thousands of happy customers
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: "Ayesha Khan",
                  rating: 5,
                  text: "Best quality groceries in Lahore! Fresh produce delivered right to my doorstep. Highly recommend!",
                  image: "👩",
                },
                {
                  name: "Ahmed Ali",
                  rating: 5,
                  text: "Excellent service and amazing prices. The meat quality is outstanding and always halal certified.",
                  image: "👨",
                },
                {
                  name: "Fatima Hassan",
                  rating: 5,
                  text: "Love the convenience of shopping online. Products are always fresh and delivery is super fast!",
                  image: "👩‍🦱",
                },
              ].map((testimonial, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
                      {testimonial.image}
                    </div>
                    <div>
                      <h4 className="font-semibold">{testimonial.name}</h4>
                      <div className="flex gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{testimonial.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section> */}

        {/* Why Choose Us */}
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

        {/* Newsletter Section */}
        {/* <section className="bg-primary text-primary-foreground py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Stay Updated with Fresh Deals!
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Subscribe to our newsletter and get exclusive offers & updates
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-6 py-4 rounded-full text-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground"
              />
              <Button
                size="lg"
                className="bg-primary-foreground text-primary hover:opacity-90 px-8 py-4 rounded-full font-semibold"
              >
                Subscribe
              </Button>
            </div>
          </div>
        </section> */}


        {/* Hot Deals / Flash Sale */}
        <section className="bg-gradient-to-br from-red-500 to-orange-500 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-white text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                  <TrendingUp className="h-8 w-8" />
                  <span className="text-xl font-bold uppercase tracking-wider">
                    Flash Sale
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  Hot Deals of the Day!
                </h2>
                <p className="text-lg md:text-xl text-white/90 mb-6">
                  Up to 50% off on selected items
                </p>
                {/* <div className="flex gap-4 justify-center md:justify-start items-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-xs uppercase">Hours</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">34</div>
                    <div className="text-xs uppercase">Minutes</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">56</div>
                    <div className="text-xs uppercase">Seconds</div>
                  </div>
                </div> */}
              </div>
              <Button
                asChild
                size="lg"
                className="bg-white text-red-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-full font-bold"
              >
                <Link href="/products?sale=true">Shop Flash Sale</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
