"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { Card } from "@/components/ui/card";
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Instagram,
  Youtube,
  MessageCircle,
  Truck,
  Shield,
  Heart,
} from "lucide-react";
import Image from "next/image";
import { AuthProvider } from "@/components/auth/AuthProvider";

interface StoreSettings {
  storeName?: string;
  storeLogoUrl?: string;
  storeDescription?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  country?: string;
  businessHours?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  whatsappNumber?: string;
}

export default function AboutPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data.settings ?? null);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const storeName = settings?.storeName || "Khas Pure Food";
  const storeDescription =
    settings?.storeDescription ||
    "We are committed to delivering fresh, high-quality groceries to your doorstep.";

  const locationDisplay =
    [settings?.address, settings?.city, settings?.country]
      .filter(Boolean)
      .join(", ") || "Lahore, Pakistan";

  const socialLinks = [
    {
      label: "Facebook",
      href: settings?.facebookUrl,
      icon: <Facebook className="h-6 w-6" />,
      color: "hover:text-blue-600",
    },
    {
      label: "Instagram",
      href: settings?.instagramUrl,
      icon: <Instagram className="h-6 w-6" />,
      color: "hover:text-pink-600",
    },
    {
      label: "YouTube",
      href: settings?.youtubeUrl,
      icon: <Youtube className="h-6 w-6" />,
      color: "hover:text-red-600",
    },
    {
      label: "WhatsApp",
      href: settings?.whatsappNumber
        ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`
        : null,
      icon: <MessageCircle className="h-6 w-6" />,
      color: "hover:text-green-600",
    },
  ].filter((x) => x.href);

  if (isLoading) {
    return (
      <AuthProvider>
        <div className="min-h-screen">
          <Navbar />
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-700 border-t-transparent" />
          </div>
          <Footer />
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 py-12">
          {/* Hero */}
          <div className="text-center mb-16">
            {settings?.storeLogoUrl && (
              <div className="relative w-32 h-32 mx-auto mb-6">
                <Image
                  src={settings.storeLogoUrl}
                  alt={storeName}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <h1 className="text-4xl font-black mb-4">About {storeName}</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {storeDescription}
            </p>
          </div>

          {/* Contact Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Store className="h-6 w-6 text-green-700" />
                Contact Information
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <MapPin className="h-5 w-5 text-green-700 mt-1" />
                  <div>
                    <p className="font-semibold">Address</p>
                    <p className="text-gray-600">{locationDisplay}</p>
                  </div>
                </div>

                {settings?.contactPhone && (
                  <div className="flex gap-4">
                    <Phone className="h-5 w-5 text-blue-700 mt-1" />
                    <div>
                      <p className="font-semibold">Phone</p>
                      <a
                        href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                        className="text-blue-600 hover:underline"
                      >
                        {settings.contactPhone}
                      </a>
                    </div>
                  </div>
                )}

                {settings?.contactEmail && (
                  <div className="flex gap-4">
                    <Mail className="h-5 w-5 text-purple-700 mt-1" />
                    <div>
                      <p className="font-semibold">Email</p>
                      <a
                        href={`mailto:${settings.contactEmail}`}
                        className="text-blue-600 hover:underline"
                      >
                        {settings.contactEmail}
                      </a>
                    </div>
                  </div>
                )}

                {settings?.businessHours && (
                  <div className="flex gap-4">
                    <Clock className="h-5 w-5 text-orange-700 mt-1" />
                    <div>
                      <p className="font-semibold">Business Hours</p>
                      <p className="text-gray-600">{settings.businessHours}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Social */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">Connect With Us</h2>

              {socialLinks.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 border rounded-lg hover:border-green-700 transition"
                    >
                      {social.icon}
                      <span className="font-semibold">{social.label}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  Social media links will appear here once configured
                </p>
              )}
            </Card>
          </div>

          {/* CTA */}
          <Card className="p-12 text-center bg-green-700 text-white">
            <h2 className="text-3xl font-black mb-4">Start Shopping Today!</h2>
            <a
              href="/products"
              className="inline-block bg-white text-green-700 font-bold px-8 py-4 rounded-lg hover:bg-gray-100 transition"
            >
              Shop Now
            </a>
          </Card>
        </main>

        <Footer />
      </div>
    </AuthProvider>
  );
}
