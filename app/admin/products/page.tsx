"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Zap,
  File as Fire,
  Upload,
  X,
  Globe,
  Store,
} from "lucide-react";
import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  retailPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  stock: number;
  category: string;
  unitType: string;
  status: string;
  isNewArrival: boolean;
  isHot: boolean;
  isFeatured: boolean;
  onlineVisible: boolean;
  mainImage?: string;
  sku?: string;
  description?: string;
}

interface Category {
  _id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    discount: "",
    discountType: "percentage" as "percentage" | "fixed",
    category: "",
    unitType: "",
    isFlashSale: false,
    isHot: false,
    isFeatured: false,
    onlineVisible: true,
    image: null as File | null,
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Image size must be less than 5MB"); return; }
    setFormData(f => ({ ...f, image: file }));
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData(f => ({ ...f, image: null }));
    setImagePreview(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "", sku: "", description: "",
      discount: "", discountType: "percentage",
      category: "", unitType: "",
      isFlashSale: false, isHot: false, isFeatured: false,
      onlineVisible: true, image: null,
    });
    setImagePreview(null);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      description: product.description || "",
      discount: product.discount?.toString() || "",
      discountType: product.discountType || "percentage",
      category: typeof product.category === "object" ? (product.category as any)._id : product.category,
      unitType: product.unitType || "",
      isFlashSale: product.isNewArrival,
      isHot: product.isHot,
      isFeatured: product.isFeatured,
      onlineVisible: product.onlineVisible ?? true,
      image: null,
    });
    setImagePreview(product.mainImage || null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitType.trim()) {
      alert("Please enter a unit type (e.g. 500ml, 1kg, per box)");
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("sku", formData.sku);
      fd.append("description", formData.description);
      fd.append("discount", formData.discount);
      fd.append("discountType", formData.discountType);
      fd.append("category", formData.category);
      fd.append("unitType", formData.unitType.trim());
      fd.append("isFlashSale", formData.isFlashSale.toString());
      fd.append("isHot", formData.isHot.toString());
      fd.append("isFeatured", formData.isFeatured.toString());
      fd.append("onlineVisible", formData.onlineVisible.toString());
      if (formData.image) fd.append("image", formData.image);

      const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, { method, body: fd });
      if (res.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchProducts();
        alert(editingId ? "Product updated!" : "Product created!");
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save product. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { alert("Product deleted!"); fetchProducts(); }
      else alert(`Failed to delete: ${data.error || "Unknown error"}`);
    } catch (err) {
      console.error(err);
      alert("Error deleting product.");
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your store products</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-green-700 hover:bg-green-800" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} required />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <Input value={formData.sku} onChange={e => setFormData(f => ({ ...f, sku: e.target.value }))} placeholder="Leave empty to auto-generate" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={3} className="resize-none" placeholder="Product description..." />
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="h-12 w-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Click to upload image</span>
                    </label>
                  </div>
                ) : (
                  <div className="relative border-2 border-gray-300 rounded-lg p-2">
                    <div className="relative w-full h-48">
                      <Image src={imagePreview} alt="Preview" fill className="object-contain" unoptimized />
                    </div>
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required>
                  <option value="">Select a category</option>
                  {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                </select>
              </div>

              {/* Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                  <Input type="number" step="0.01" value={formData.discount} onChange={e => setFormData(f => ({ ...f, discount: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select value={formData.discountType} onChange={e => setFormData(f => ({ ...f, discountType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (Rs)</option>
                  </select>
                </div>
              </div>

              {/* Unit Type — free text only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type *</label>
                <Input
                  value={formData.unitType}
                  onChange={e => setFormData(f => ({ ...f, unitType: e.target.value }))}
                  placeholder="e.g. 500ml, 1kg, per box, 6 pieces"
                  required
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">💡 Stock and price are set through inventory purchases.</p>
              </div>

              {/* Tags & Visibility */}
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-gray-700">Product Tags & Visibility</p>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isFlashSale} onChange={e => setFormData(f => ({ ...f, isFlashSale: e.target.checked }))} className="rounded" />
                  <Zap className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Flash Sale</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isHot} onChange={e => setFormData(f => ({ ...f, isHot: e.target.checked }))} className="rounded" />
                  <Fire className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Hot Product</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData(f => ({ ...f, isFeatured: e.target.checked }))} className="rounded" />
                  <span className="text-sm font-medium">Featured</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 bg-green-50 rounded-lg border border-green-200">
                  <input type="checkbox" checked={formData.onlineVisible} onChange={e => setFormData(f => ({ ...f, onlineVisible: e.target.checked }))} className="rounded accent-green-600" />
                  <Globe className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-green-900">List in Online Store</span>
                    <p className="text-xs text-green-700 mt-0.5">Show this product on your website</p>
                  </div>
                </label>
              </div>

              <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={categories.length === 0 || isUploading}>
                {isUploading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Product" : "Create Product")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-5 w-5 text-gray-400 absolute top-3 left-3" />
        <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {/* Table */}
      <Card className="p-6 border-0 shadow-md overflow-x-auto">
        {isLoading ? (
          <p>Loading products...</p>
        ) : filteredProducts.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {["Image", "Name", "Unit", "Price", "Stock", "Tags", "Actions"].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {product.mainImage ? (
                      <div className="relative w-12 h-12">
                        <Image src={product.mainImage} alt={product.name} fill className="object-cover rounded" unoptimized />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No img</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{product.unitType || "—"}</td>
                  <td className="py-3 px-4 text-sm">Rs. {product.retailPrice}</td>
                  <td className="py-3 px-4 text-sm">{product.stock}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
                      {product.onlineVisible ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          <Globe className="h-3 w-3" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                          <Store className="h-3 w-3" /> POS Only
                        </span>
                      )}
                      {product.isNewArrival && (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                          <Zap className="h-3 w-3" /> Flash
                        </span>
                      )}
                      {product.isHot && (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                          <Fire className="h-3 w-3" /> Hot
                        </span>
                      )}
                      {product.isFeatured && (
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Featured</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(product._id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-500 py-8">No products found</p>
        )}
      </Card>
    </div>
  );
}