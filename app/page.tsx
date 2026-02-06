import { Navbar } from '@/components/store/Navbar';
import { HeroCarousel } from '@/components/store/HeroCarousel';
import { BundlesSection } from '@/components/store/BundlesSection';
import { FeaturedProducts } from '@/components/store/FeaturedProducts';
import { Footer } from '@/components/store/Footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <HeroCarousel />
        <BundlesSection />
        <FeaturedProducts />
        
        {/* All Products Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">All Products</h2>
              <p className="text-gray-600 mt-2">Explore our complete catalog</p>
            </div>
            <Button asChild className="bg-green-700 hover:bg-green-800">
              <Link href="/products">View All Products</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
