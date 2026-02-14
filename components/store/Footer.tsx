"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface StoreSettings {
  storeName?: string;
  storeDescription?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  country?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  whatsappNumber?: string;
}

export function Footer() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings ?? null))
      .catch(console.error);
  }, []);

  const storeName = settings?.storeName ?? "";
  const storeDescription =
    settings?.storeDescription ??
    "Khas Pure Food delivers fresh, quality groceries to your doorstep.";

  const phoneDisplay = settings?.contactPhone ?? "+92 300 1234567";
  const emailDisplay = settings?.contactEmail ?? "info@khaspurefood.com";

  const locationDisplay =
    [settings?.address, settings?.city, settings?.country]
      .filter(Boolean)
      .join(", ") || "Lahore, Pakistan";

  const socialLinks = [
    {
      label: "Facebook",
      href: settings?.facebookUrl,
      icon: <Facebook className="h-5 w-5" />,
    },
    {
      label: "Instagram",
      href: settings?.instagramUrl,
      icon: <Instagram className="h-5 w-5" />,
    },
    {
      label: "YouTube",
      href: settings?.youtubeUrl,
      icon: <Youtube className="h-5 w-5" />,
    },
    {
      label: "WhatsApp",
      href: settings?.whatsappNumber
        ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`
        : null,
      icon: <MessageCircle className="h-5 w-5" />,
    },
  ].filter((x) => x.href);

  return (
    <footer className="bg-gray-900 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-green-400">About Us</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {storeDescription}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-green-400">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/sale" className="hover:text-white transition">
                  Sale
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-green-400">
              Contact Info
            </h3>
            <ul className="space-y-3 text-sm text-gray-400">
              {locationDisplay && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 mt-0.5 text-green-400 shrink-0" />
                  <span>{locationDisplay}</span>
                </li>
              )}

              {phoneDisplay && (
                <li className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-green-400 shrink-0" />
                  <a
                    href={`tel:${phoneDisplay.replace(/\s/g, "")}`}
                    className="hover:text-white transition"
                  >
                    {phoneDisplay}
                  </a>
                </li>
              )}

              {emailDisplay && (
                <li className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-green-400 shrink-0" />
                  <a
                    href={`mailto:${emailDisplay}`}
                    className="hover:text-white transition"
                  >
                    {emailDisplay}
                  </a>
                </li>
              )}
              {/* Social Icons */}
              {socialLinks.length > 0 && (
                <div className="flex gap-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-green-400 transition-colors"
                      aria-label={social.label}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 ">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {storeName}. All rights reserved.
              Developed by Devntom Solutions
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
