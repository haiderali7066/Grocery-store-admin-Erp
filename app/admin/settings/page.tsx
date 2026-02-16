// app/admin/settings/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store,
  Globe,
  CreditCard,
  Receipt,
  ImageIcon,
  Plus,
  Trash2,
  Upload,
  Save,
  CheckCircle,
  AlertCircle,
  Truck,
} from "lucide-react";
import Image from "next/image";
import PermissionGuard from "@/components/admin/PermissionGuard";

interface Settings {
  storeName: string;
  storeLogoUrl: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  country: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  whatsappNumber: string;
  taxRate: number;
  taxName: string;
  taxEnabled: boolean;
  paymentMethods: {
    cod: { enabled: boolean; displayName: string; description: string };
    bank: {
      enabled: boolean;
      displayName: string;
      accountName: string;
      accountNumber: string;
      bankName: string;
      iban: string;
    };
    easypaisa: {
      enabled: boolean;
      displayName: string;
      accountNumber: string;
      accountName: string;
    };
    jazzcash: {
      enabled: boolean;
      displayName: string;
      accountNumber: string;
      accountName: string;
    };
  };
  heroBanners: HeroBanner[];
  businessHours: string;
  freeShippingThreshold: number;
  shippingCost: number;
}

interface HeroBanner {
  title: string;
  subtitle: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_SETTINGS: Settings = {
  storeName: "",
  storeLogoUrl: "",
  storeDescription: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  city: "",
  country: "",
  facebookUrl: "",
  instagramUrl: "",
  twitterUrl: "",
  youtubeUrl: "",
  tiktokUrl: "",
  whatsappNumber: "",
  taxRate: 0,
  taxName: "",
  taxEnabled: false,
  paymentMethods: {
    cod: { enabled: false, displayName: "", description: "" },
    bank: {
      enabled: false,
      displayName: "",
      accountName: "",
      accountNumber: "",
      bankName: "",
      iban: "",
    },
    easypaisa: {
      enabled: false,
      displayName: "",
      accountNumber: "",
      accountName: "",
    },
    jazzcash: {
      enabled: false,
      displayName: "",
      accountNumber: "",
      accountName: "",
    },
  },
  heroBanners: [],
  businessHours: "",
  freeShippingThreshold: 0,
  shippingCost: 0,
};

type ToastType = "success" | "error" | null;

function SettingsContent() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [bannerFiles, setBannerFiles] = useState<{ [key: number]: File }>({});
  const [bannerPreviews, setBannerPreviews] = useState<{
    [key: number]: string;
  }>({});
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({
    type: null,
    message: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 3500);
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.settings) {
        const s = data.settings;

        console.log("✅ Admin Settings Loaded:", {
          taxEnabled: s.taxEnabled,
          taxRate: s.taxRate,
          taxName: s.taxName,
        });

        setSettings({
          storeName: s.storeName || "",
          storeLogoUrl: s.storeLogoUrl || "",
          storeDescription: s.storeDescription || "",
          contactEmail: s.contactEmail || "",
          contactPhone: s.contactPhone || "",
          address: s.address || "",
          city: s.city || "",
          country: s.country || "",
          facebookUrl: s.facebookUrl || "",
          instagramUrl: s.instagramUrl || "",
          twitterUrl: s.twitterUrl || "",
          youtubeUrl: s.youtubeUrl || "",
          tiktokUrl: s.tiktokUrl || "",
          whatsappNumber: s.whatsappNumber || "",
          taxRate: s.taxRate ?? 17,
          taxName: s.taxName || "GST",
          taxEnabled: s.taxEnabled ?? true,
          businessHours: s.businessHours || "",
          freeShippingThreshold: s.freeShippingThreshold ?? 0,
          shippingCost: s.shippingCost ?? 0,
          heroBanners: s.heroBanners || [],
          paymentMethods: {
            cod: {
              enabled: s.paymentMethods?.cod?.enabled ?? false,
              displayName: s.paymentMethods?.cod?.displayName || "",
              description: s.paymentMethods?.cod?.description || "",
            },
            bank: {
              enabled: s.paymentMethods?.bank?.enabled ?? false,
              displayName: s.paymentMethods?.bank?.displayName || "",
              accountName: s.paymentMethods?.bank?.accountName || "",
              accountNumber: s.paymentMethods?.bank?.accountNumber || "",
              bankName: s.paymentMethods?.bank?.bankName || "",
              iban: s.paymentMethods?.bank?.iban || "",
            },
            easypaisa: {
              enabled: s.paymentMethods?.easypaisa?.enabled ?? false,
              displayName: s.paymentMethods?.easypaisa?.displayName || "",
              accountNumber: s.paymentMethods?.easypaisa?.accountNumber || "",
              accountName: s.paymentMethods?.easypaisa?.accountName || "",
            },
            jazzcash: {
              enabled: s.paymentMethods?.jazzcash?.enabled ?? false,
              displayName: s.paymentMethods?.jazzcash?.displayName || "",
              accountNumber: s.paymentMethods?.jazzcash?.accountNumber || "",
              accountName: s.paymentMethods?.jazzcash?.accountName || "",
            },
          },
        });
        setLogoPreview(s.storeLogoUrl || "");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      showToast("error", "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setBannerFiles({ ...bannerFiles, [index]: file });
      setBannerPreviews({
        ...bannerPreviews,
        [index]: URL.createObjectURL(file),
      });
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!,
    );
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
      { method: "POST", body: formData },
    );
    const data = await res.json();
    return data.secure_url;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let logoUrl = settings.storeLogoUrl;
      if (logoFile) {
        logoUrl = await uploadImage(logoFile);
      }

      const updatedBanners = await Promise.all(
        settings.heroBanners.map(async (banner, index) => {
          if (bannerFiles[index]) {
            const imageUrl = await uploadImage(bannerFiles[index]);
            return { ...banner, imageUrl };
          }
          return banner;
        }),
      );

      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          storeLogoUrl: logoUrl,
          heroBanners: updatedBanners,
        }),
      });

      if (response.ok) {
        showToast("success", "Settings saved successfully!");
        setBannerFiles({});
        setBannerPreviews({});
        fetchSettings();
      } else {
        const err = await response.json();
        showToast("error", err.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("error", "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const addHeroBanner = () => {
    setSettings({
      ...settings,
      heroBanners: [
        ...settings.heroBanners,
        {
          title: "",
          subtitle: "",
          imageUrl: "",
          link: "",
          isActive: true,
          sortOrder: settings.heroBanners.length,
        },
      ],
    });
  };

  const updateHeroBanner = (index: number, field: string, value: any) => {
    const newBanners = [...settings.heroBanners];
    newBanners[index] = { ...newBanners[index], [field]: value };
    setSettings({ ...settings, heroBanners: newBanners });
  };

  const removeHeroBanner = (index: number) => {
    setSettings({
      ...settings,
      heroBanners: settings.heroBanners.filter((_, i) => i !== index),
    });
  };

  const updatePayment = (
    method: keyof Settings["paymentMethods"],
    field: string,
    value: any,
  ) => {
    setSettings({
      ...settings,
      paymentMethods: {
        ...settings.paymentMethods,
        [method]: { ...settings.paymentMethods[method], [field]: value },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast.type && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-8 w-8" />
            Store Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your store information and appearance
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-green-700 hover:bg-green-800 gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="store">Store Info</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="banners">Hero Banners</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="tax">Tax & Shipping</TabsTrigger>
        </TabsList>

        {/* Store Info Tab */}
        <TabsContent value="store" className="space-y-4">
          <Card className="p-6 border-0 shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Store Information
            </h2>

            {/* Logo Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={logoPreview}
                      alt="Store Logo"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center">
                    No logo
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      document.getElementById("logo-upload")?.click()
                    }
                  >
                    <Upload className="h-4 w-4" />
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 200×200px, PNG or JPG
                  </p>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview("");
                        setLogoFile(null);
                        setSettings({ ...settings, storeLogoUrl: "" });
                      }}
                      className="text-xs text-red-500 mt-1 hover:underline"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={settings.storeName}
                  onChange={(e) =>
                    setSettings({ ...settings, storeName: e.target.value })
                  }
                  placeholder="Khas Pure Food"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Description
                </label>
                <Textarea
                  value={settings.storeDescription}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      storeDescription: e.target.value,
                    })
                  }
                  placeholder="Brief description of your store..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        contactEmail: e.target.value,
                      })
                    }
                    placeholder="info@khaspurefood.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    value={settings.contactPhone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        contactPhone: e.target.value,
                      })
                    }
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <Input
                  value={settings.address}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    value={settings.city}
                    onChange={(e) =>
                      setSettings({ ...settings, city: e.target.value })
                    }
                    placeholder="Lahore"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <Input
                    value={settings.country}
                    onChange={(e) =>
                      setSettings({ ...settings, country: e.target.value })
                    }
                    placeholder="Pakistan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Hours
                </label>
                <Input
                  value={settings.businessHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessHours: e.target.value,
                    })
                  }
                  placeholder="Mon-Sat: 8AM - 10PM"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-4">
          <Card className="p-6 border-0 shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Social Media Links
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              These appear in the footer and about page.
            </p>

            <div className="space-y-4">
              {[
                {
                  key: "facebookUrl",
                  label: "Facebook URL",
                  placeholder: "https://facebook.com/yourpage",
                },
                {
                  key: "instagramUrl",
                  label: "Instagram URL",
                  placeholder: "https://instagram.com/yourpage",
                },
                {
                  key: "twitterUrl",
                  label: "Twitter / X URL",
                  placeholder: "https://twitter.com/yourpage",
                },
                {
                  key: "youtubeUrl",
                  label: "YouTube Channel URL",
                  placeholder: "https://youtube.com/@yourchannel",
                },
                {
                  key: "tiktokUrl",
                  label: "TikTok URL",
                  placeholder: "https://tiktok.com/@yourusername",
                },
                {
                  key: "whatsappNumber",
                  label: "WhatsApp Number",
                  placeholder: "+923001234567 (no spaces)",
                },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <Input
                    value={(settings as any)[key] || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, [key]: e.target.value })
                    }
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Hero Banners Tab */}
        <TabsContent value="banners" className="space-y-4">
          <Card className="p-6 border-0 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Hero Banners
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Only active banners are shown on the homepage carousel.
                </p>
              </div>
              <Button onClick={addHeroBanner} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Banner
              </Button>
            </div>

            <div className="space-y-4 mt-4">
              {settings.heroBanners.map((banner, index) => (
                <Card
                  key={index}
                  className="p-4 bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700">
                        Banner {index + 1}
                      </span>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={banner.isActive}
                          onChange={(e) =>
                            updateHeroBanner(
                              index,
                              "isActive",
                              e.target.checked,
                            )
                          }
                          className="rounded"
                        />
                        <span
                          className={
                            banner.isActive
                              ? "text-green-600 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {banner.isActive ? "Active" : "Inactive"}
                        </span>
                      </label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeroBanner(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <Input
                        value={banner.title || ""}
                        onChange={(e) =>
                          updateHeroBanner(index, "title", e.target.value)
                        }
                        placeholder="e.g. Fresh Produce Daily"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtitle
                      </label>
                      <Input
                        value={banner.subtitle || ""}
                        onChange={(e) =>
                          updateHeroBanner(index, "subtitle", e.target.value)
                        }
                        placeholder="e.g. Farm-fresh delivered daily"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link (Button URL)
                      </label>
                      <Input
                        value={banner.link || ""}
                        onChange={(e) =>
                          updateHeroBanner(index, "link", e.target.value)
                        }
                        placeholder="/products or /products?category=fruits"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sort Order
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={banner.sortOrder ?? index}
                        onChange={(e) =>
                          updateHeroBanner(
                            index,
                            "sortOrder",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banner Image
                      </label>
                      <div className="flex items-center gap-4">
                        {(bannerPreviews[index] || banner.imageUrl) && (
                          <div className="relative w-40 h-24 rounded-lg overflow-hidden border-2 border-gray-200 shrink-0">
                            <Image
                              src={bannerPreviews[index] || banner.imageUrl}
                              alt={`Banner ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBannerImageChange(index, e)}
                            className="hidden"
                            id={`banner-upload-${index}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() =>
                              document
                                .getElementById(`banner-upload-${index}`)
                                ?.click()
                            }
                          >
                            <Upload className="h-4 w-4" />
                            {banner.imageUrl ? "Change Image" : "Upload Image"}
                          </Button>
                          <p className="text-xs text-gray-500 mt-1">
                            Recommended: 1920×600px, JPG or PNG
                          </p>
                          {(bannerPreviews[index] || banner.imageUrl) && (
                            <button
                              type="button"
                              onClick={() => {
                                const newBannerFiles = { ...bannerFiles };
                                delete newBannerFiles[index];
                                setBannerFiles(newBannerFiles);
                                const newPreviews = { ...bannerPreviews };
                                delete newPreviews[index];
                                setBannerPreviews(newPreviews);
                                updateHeroBanner(index, "imageUrl", "");
                              }}
                              className="text-xs text-red-500 mt-1 hover:underline block"
                            >
                              Remove image
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {settings.heroBanners.length === 0 && (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    No banners yet. Click &quot;Add Banner&quot; to create one.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card className="p-6 border-0 shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Enabled methods are shown to customers at checkout.
            </p>

            <div className="space-y-6">
              {/* COD */}
              <PaymentSection
                title="Cash on Delivery (COD)"
                enabled={settings.paymentMethods.cod.enabled}
                onToggle={(v) => updatePayment("cod", "enabled", v)}
              >
                <Input
                  value={settings.paymentMethods.cod.displayName}
                  onChange={(e) =>
                    updatePayment("cod", "displayName", e.target.value)
                  }
                  placeholder="Display Name (e.g. Cash on Delivery)"
                />
                <Textarea
                  value={settings.paymentMethods.cod.description}
                  onChange={(e) =>
                    updatePayment("cod", "description", e.target.value)
                  }
                  placeholder="Description shown to customers..."
                  rows={2}
                />
              </PaymentSection>

              {/* Bank Transfer */}
              <PaymentSection
                title="Bank Transfer"
                enabled={settings.paymentMethods.bank.enabled}
                onToggle={(v) => updatePayment("bank", "enabled", v)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    value={settings.paymentMethods.bank.bankName}
                    onChange={(e) =>
                      updatePayment("bank", "bankName", e.target.value)
                    }
                    placeholder="Bank Name"
                  />
                  <Input
                    value={settings.paymentMethods.bank.accountName}
                    onChange={(e) =>
                      updatePayment("bank", "accountName", e.target.value)
                    }
                    placeholder="Account Name"
                  />
                  <Input
                    value={settings.paymentMethods.bank.accountNumber}
                    onChange={(e) =>
                      updatePayment("bank", "accountNumber", e.target.value)
                    }
                    placeholder="Account Number"
                  />
                  <Input
                    value={settings.paymentMethods.bank.iban}
                    onChange={(e) =>
                      updatePayment("bank", "iban", e.target.value)
                    }
                    placeholder="IBAN (optional)"
                  />
                </div>
              </PaymentSection>

              {/* EasyPaisa */}
              <PaymentSection
                title="EasyPaisa"
                enabled={settings.paymentMethods.easypaisa.enabled}
                onToggle={(v) => updatePayment("easypaisa", "enabled", v)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    value={settings.paymentMethods.easypaisa.accountName}
                    onChange={(e) =>
                      updatePayment("easypaisa", "accountName", e.target.value)
                    }
                    placeholder="Account Name"
                  />
                  <Input
                    value={settings.paymentMethods.easypaisa.accountNumber}
                    onChange={(e) =>
                      updatePayment(
                        "easypaisa",
                        "accountNumber",
                        e.target.value,
                      )
                    }
                    placeholder="Account Number"
                  />
                </div>
              </PaymentSection>

              {/* JazzCash */}
              <PaymentSection
                title="JazzCash"
                enabled={settings.paymentMethods.jazzcash.enabled}
                onToggle={(v) => updatePayment("jazzcash", "enabled", v)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    value={settings.paymentMethods.jazzcash.accountName}
                    onChange={(e) =>
                      updatePayment("jazzcash", "accountName", e.target.value)
                    }
                    placeholder="Account Name"
                  />
                  <Input
                    value={settings.paymentMethods.jazzcash.accountNumber}
                    onChange={(e) =>
                      updatePayment("jazzcash", "accountNumber", e.target.value)
                    }
                    placeholder="Account Number"
                  />
                </div>
              </PaymentSection>
            </div>
          </Card>
        </TabsContent>

        {/* Tax & Shipping Tab */}
        <TabsContent value="tax" className="space-y-4">
          {/* Tax */}
          <Card className="p-6 border-0 shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Tax Settings
            </h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.taxEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, taxEnabled: e.target.checked })
                  }
                  className="rounded w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable Tax
                </span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Name
                  </label>
                  <Input
                    value={settings.taxName}
                    onChange={(e) =>
                      setSettings({ ...settings, taxName: e.target.value })
                    }
                    placeholder="GST, VAT, etc."
                    disabled={!settings.taxEnabled}
                    className={!settings.taxEnabled ? "opacity-50" : ""}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.taxRate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        taxRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="17"
                    disabled={!settings.taxEnabled}
                    className={!settings.taxEnabled ? "opacity-50" : ""}
                  />
                </div>
              </div>

              {/* Status Indicator */}
              {settings.taxEnabled ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-semibold mb-1">
                    ✓ Tax Active: {settings.taxName || "Tax"} at{" "}
                    {settings.taxRate}%
                  </p>
                  <p className="text-xs text-green-700">
                    Example calculation: Rs. 1,000 subtotal = Rs.{" "}
                    {((1000 * settings.taxRate) / 100).toFixed(0)} tax = Rs.{" "}
                    {(1000 + (1000 * settings.taxRate) / 100).toFixed(0)} total
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 font-semibold">
                    ⚠ Tax Disabled
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    No tax will be charged to customers at checkout
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Shipping */}
          <Card className="p-6 border-0 shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Cost (Rs)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.shippingCost}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shippingCost: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Free Shipping Above (Rs)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.freeShippingThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      freeShippingThreshold: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="2000"
                />
              </div>
            </div>
            {settings.freeShippingThreshold > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Free Shipping Active:</strong> Orders above Rs.{" "}
                  {settings.freeShippingThreshold.toLocaleString()} get free
                  shipping
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-3">
                Flat shipping rate of Rs.{" "}
                {settings.shippingCost.toLocaleString()} on all orders
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Payment section component
function PaymentSection({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border rounded-xl p-4 transition-colors ${
        enabled ? "border-green-300 bg-green-50/30" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-500">
            {enabled ? "Enabled" : "Disabled"}
          </span>
          <div
            onClick={() => onToggle(!enabled)}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
              enabled ? "bg-green-600" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
        </label>
      </div>
      <div
        className={`space-y-3 ${!enabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

// Main export with PermissionGuard
export default function SettingsPage() {
  return (
    <PermissionGuard roles={["admin"]}>
      <SettingsContent />
    </PermissionGuard>
  );
}
