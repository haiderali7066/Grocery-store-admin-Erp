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
} from "lucide-react";
import Image from "next/image";

interface HeroBanner {
  title: string;
  subtitle: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
  sortOrder: number;
}

interface Settings {
  // Store Info
  storeName: string;
  storeLogoUrl: string;
  storeDescription: string;

  // Contact
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  country: string;

  // Social Media
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  whatsappNumber: string;

  // Tax
  taxRate: number;
  taxName: string;
  taxEnabled: boolean;

  // Payment Methods
  paymentMethods: {
    cod: {
      enabled: boolean;
      displayName: string;
      description: string;
    };
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

  // Hero Banners
  heroBanners: HeroBanner[];

  // Business Hours
  businessHours: string;

  // Shipping
  freeShippingThreshold: number;
  shippingCost: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
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
    whatsappNumber: "",
    taxRate: 0,
    taxName: "",
    taxEnabled: false,
    paymentMethods: {
      cod: {
        enabled: false,
        displayName: "",
        description: "",
      },
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
  });

  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [bannerFiles, setBannerFiles] = useState<{ [key: number]: File }>({});
  const [bannerPreviews, setBannerPreviews] = useState<{
    [key: number]: string;
  }>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.settings) {
        setSettings({
          storeName: data.settings.storeName || "",
          storeLogoUrl: data.settings.storeLogoUrl || "",
          storeDescription: data.settings.storeDescription || "",
          contactEmail: data.settings.contactEmail || "",
          contactPhone: data.settings.contactPhone || "",
          address: data.settings.address || "",
          city: data.settings.city || "",
          country: data.settings.country || "",
          facebookUrl: data.settings.facebookUrl || "",
          instagramUrl: data.settings.instagramUrl || "",
          twitterUrl: data.settings.twitterUrl || "",
          whatsappNumber: data.settings.whatsappNumber || "",
          taxRate: data.settings.taxRate || 0,
          taxName: data.settings.taxName || "",
          taxEnabled: data.settings.taxEnabled || false,
          businessHours: data.settings.businessHours || "",
          freeShippingThreshold: data.settings.freeShippingThreshold || 0,
          shippingCost: data.settings.shippingCost || 0,
          heroBanners: data.settings.heroBanners || [],
          paymentMethods: {
            cod: {
              enabled: data.settings.paymentMethods?.cod?.enabled ?? false,
              displayName: data.settings.paymentMethods?.cod?.displayName || "",
              description: data.settings.paymentMethods?.cod?.description || "",
            },
            bank: {
              enabled: data.settings.paymentMethods?.bank?.enabled ?? false,
              displayName:
                data.settings.paymentMethods?.bank?.displayName || "",
              accountName:
                data.settings.paymentMethods?.bank?.accountName || "",
              accountNumber:
                data.settings.paymentMethods?.bank?.accountNumber || "",
              bankName: data.settings.paymentMethods?.bank?.bankName || "",
              iban: data.settings.paymentMethods?.bank?.iban || "",
            },
            easypaisa: {
              enabled:
                data.settings.paymentMethods?.easypaisa?.enabled ?? false,
              displayName:
                data.settings.paymentMethods?.easypaisa?.displayName || "",
              accountNumber:
                data.settings.paymentMethods?.easypaisa?.accountNumber || "",
              accountName:
                data.settings.paymentMethods?.easypaisa?.accountName || "",
            },
            jazzcash: {
              enabled: data.settings.paymentMethods?.jazzcash?.enabled ?? false,
              displayName:
                data.settings.paymentMethods?.jazzcash?.displayName || "",
              accountNumber:
                data.settings.paymentMethods?.jazzcash?.accountNumber || "",
              accountName:
                data.settings.paymentMethods?.jazzcash?.accountName || "",
            },
          },
        });
        setLogoPreview(data.settings.storeLogoUrl || "");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
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

  const uploadImage = async (file: File) => {
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

  const uploadLogo = async () => {
    if (!logoFile) return settings.storeLogoUrl;
    return await uploadImage(logoFile);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upload logo if new file selected
      let logoUrl = settings.storeLogoUrl;
      if (logoFile) {
        logoUrl = await uploadLogo();
      }

      // Upload banner images if new files selected
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
        alert("Settings saved successfully!");
        setBannerFiles({});
        setBannerPreviews({});
        fetchSettings();
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
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
    const newBanners = settings.heroBanners.filter((_, i) => i !== index);
    setSettings({ ...settings, heroBanners: newBanners });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-8 w-8" />
            Store Settings
          </h1>
          <p className="text-gray-600">
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
          <TabsTrigger value="tax">Tax Settings</TabsTrigger>
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
                {logoPreview && (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={logoPreview}
                      alt="Store Logo"
                      fill
                      className="object-cover"
                    />
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
                  <label htmlFor="logo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 cursor-pointer"
                      onClick={() =>
                        document.getElementById("logo-upload")?.click()
                      }
                    >
                      <Upload className="h-4 w-4" />
                      Upload Logo
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 200x200px, PNG or JPG
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Name
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
                      setSettings({ ...settings, contactEmail: e.target.value })
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
                      setSettings({ ...settings, contactPhone: e.target.value })
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
                  placeholder="Store Address"
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
                    setSettings({ ...settings, businessHours: e.target.value })
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
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Social Media Links
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook URL
                </label>
                <Input
                  value={settings.facebookUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, facebookUrl: e.target.value })
                  }
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram URL
                </label>
                <Input
                  value={settings.instagramUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, instagramUrl: e.target.value })
                  }
                  placeholder="https://instagram.com/yourpage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter URL
                </label>
                <Input
                  value={settings.twitterUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, twitterUrl: e.target.value })
                  }
                  placeholder="https://twitter.com/yourpage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number
                </label>
                <Input
                  value={settings.whatsappNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappNumber: e.target.value })
                  }
                  placeholder="+92 300 1234567"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Hero Banners Tab */}
        <TabsContent value="banners" className="space-y-4">
          <Card className="p-6 border-0 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Hero Banners
              </h2>
              <Button onClick={addHeroBanner} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Banner
              </Button>
            </div>

            <div className="space-y-4">
              {settings.heroBanners.map((banner, index) => (
                <Card key={index} className="p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">
                      Banner {index + 1}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeroBanner(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        placeholder="Banner Title"
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
                        placeholder="Banner Subtitle"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banner Image
                      </label>
                      <div className="flex items-center gap-4">
                        {(bannerPreviews[index] || banner.imageUrl) && (
                          <div className="relative w-32 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
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
                          <label htmlFor={`banner-upload-${index}`}>
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2 cursor-pointer"
                              onClick={() =>
                                document
                                  .getElementById(`banner-upload-${index}`)
                                  ?.click()
                              }
                            >
                              <Upload className="h-4 w-4" />
                              {banner.imageUrl
                                ? "Change Image"
                                : "Upload Image"}
                            </Button>
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Recommended: 1920x600px, JPG or PNG
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link
                      </label>
                      <Input
                        value={banner.link || ""}
                        onChange={(e) =>
                          updateHeroBanner(index, "link", e.target.value)
                        }
                        placeholder="/products"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={banner.isActive}
                        onChange={(e) =>
                          updateHeroBanner(index, "isActive", e.target.checked)
                        }
                        className="rounded"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Active
                      </label>
                    </div>
                  </div>
                </Card>
              ))}

              {settings.heroBanners.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No banners yet. Click "Add Banner" to create one.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card className="p-6 border-0 shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </h2>

            {/* COD */}
            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">
                    Cash on Delivery (COD)
                  </h3>
                  <input
                    type="checkbox"
                    checked={settings.paymentMethods.cod.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          cod: {
                            ...settings.paymentMethods.cod,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    value={settings.paymentMethods.cod.displayName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          cod: {
                            ...settings.paymentMethods.cod,
                            displayName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Display Name"
                  />
                  <Textarea
                    value={settings.paymentMethods.cod.description}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          cod: {
                            ...settings.paymentMethods.cod,
                            description: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Description"
                    rows={2}
                  />
                </div>
              </div>

              {/* Bank Transfer */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Bank Transfer</h3>
                  <input
                    type="checkbox"
                    checked={settings.paymentMethods.bank.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          bank: {
                            ...settings.paymentMethods.bank,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={settings.paymentMethods.bank.bankName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          bank: {
                            ...settings.paymentMethods.bank,
                            bankName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Bank Name"
                  />
                  <Input
                    value={settings.paymentMethods.bank.accountName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          bank: {
                            ...settings.paymentMethods.bank,
                            accountName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Account Name"
                  />
                  <Input
                    value={settings.paymentMethods.bank.accountNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          bank: {
                            ...settings.paymentMethods.bank,
                            accountNumber: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Account Number"
                  />
                  <Input
                    value={settings.paymentMethods.bank.iban}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          bank: {
                            ...settings.paymentMethods.bank,
                            iban: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="IBAN (optional)"
                  />
                </div>
              </div>

              {/* EasyPaisa */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">EasyPaisa</h3>
                  <input
                    type="checkbox"
                    checked={settings.paymentMethods.easypaisa.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          easypaisa: {
                            ...settings.paymentMethods.easypaisa,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={settings.paymentMethods.easypaisa.accountName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          easypaisa: {
                            ...settings.paymentMethods.easypaisa,
                            accountName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Account Name"
                  />
                  <Input
                    value={settings.paymentMethods.easypaisa.accountNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          easypaisa: {
                            ...settings.paymentMethods.easypaisa,
                            accountNumber: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Account Number"
                  />
                </div>
              </div>

              {/* JazzCash */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">JazzCash</h3>
                  <input
                    type="checkbox"
                    checked={settings.paymentMethods.jazzcash.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          jazzcash: {
                            ...settings.paymentMethods.jazzcash,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={settings.paymentMethods.jazzcash.accountName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          jazzcash: {
                            ...settings.paymentMethods.jazzcash,
                            accountName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Account Name"
                  />
                  <Input
                    value={settings.paymentMethods.jazzcash.accountNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paymentMethods: {
                          ...settings.paymentMethods,
                          jazzcash: {
                            ...settings.paymentMethods.jazzcash,
                            accountNumber: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Account Number"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tax Settings Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card className="p-6 border-0 shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Tax Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={settings.taxEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, taxEnabled: e.target.checked })
                  }
                  className="rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Enable Tax
                </label>
              </div>

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
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current rate: {settings.taxRate}%
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Tax will be automatically calculated
                  and displayed at checkout. Changes apply to all new orders.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
