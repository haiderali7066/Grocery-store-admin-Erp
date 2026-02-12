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
} from "lucide-react";
import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  retailPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  stock: number;
  category: string; // Assuming this is the ID. If populated object, handle accordingly.
  weight: number; // Added to interface based on usage
  weightUnit: string; // Added to interface based on usage
  status: string;
  isNewArrival: boolean;
  isHot: boolean;
  isFeatured: boolean;
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

  // Track which product is being edited (null = creating new)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    discount: "",
    discountType: "percentage" as const,
    category: "",
    weight: "",
    weightUnit: "kg",
    isFlashSale: false,
    isHot: false,
    isFeatured: false,
    image: null as File | null,
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      discount: "",
      discountType: "percentage",
      category: "",
      weight: "",
      weightUnit: "kg",
      isFlashSale: false,
      isHot: false,
      isFeatured: false,
      image: null,
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
      category: product.category, // Ensure this matches the ID format of your <select>
      weight: (product as any).unitSize?.toString() || "", // Adjust based on your actual DB field name (unitSize vs weight)
      weightUnit: (product as any).unitType || "kg", // Adjust based on your actual DB field name (unitType vs weightUnit)
      isFlashSale: product.isNewArrival,
      isHot: product.isHot,
      isFeatured: product.isFeatured,
      image: null, // Reset file input
    });
    setImagePreview(product.mainImage || null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("sku", formData.sku);
      submitData.append("description", formData.description);
      submitData.append("discount", formData.discount);
      submitData.append("discountType", formData.discountType);
      submitData.append("category", formData.category);
      submitData.append("weight", formData.weight);
      submitData.append("weightUnit", formData.weightUnit);
      submitData.append("isFlashSale", formData.isFlashSale.toString());
      submitData.append("isHot", formData.isHot.toString());
      submitData.append("isFeatured", formData.isFeatured.toString());

      if (formData.image) {
        submitData.append("image", formData.image);
      }

      // Determine URL and Method based on editing state
      const url = editingId
        ? `/api/admin/products/${editingId}`
        : "/api/admin/products";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        body: submitData,
      });

      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchProducts();
        alert(
          editingId
            ? "Product updated successfully!"
            : "Product created successfully!",
        );
      } else {
        const errorData = await response.json();
        alert(`Failed to save product: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert("Product deleted successfully!");
        fetchProducts();
      } else {
        alert(`Failed to delete: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Error deleting product. Check console for details.");
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your store products</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm(); // Reset form when dialog closes
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-green-700 hover:bg-green-800"
              onClick={resetForm} // Ensure form is clean for "Add"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU (Stock Keeping Unit)
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="Leave empty to auto-generate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter product description..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Click to upload product image
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="relative border-2 border-gray-300 rounded-lg p-2">
                    <div className="relative w-full h-48">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData({ ...formData, discount: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (Rs)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight/Quantity *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    value={formData.weightUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, weightUnit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="liter">liter</option>
                    <option value="ml">ml</option>
                    <option value="piece">piece</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  💡 Stock will be added during inventory purchases.
                </p>
              </div>

              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-gray-700">
                  Product Tags
                </p>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFlashSale}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isFlashSale: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <Zap className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Flash Sale</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHot}
                    onChange={(e) =>
                      setFormData({ ...formData, isHot: e.target.checked })
                    }
                    className="rounded"
                  />
                  <Fire className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Hot Product</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData({ ...formData, isFeatured: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Featured</span>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-800"
                disabled={categories.length === 0 || isUploading}
              >
                {isUploading
                  ? editingId
                    ? "Updating..."
                    : "Creating..."
                  : editingId
                    ? "Update Product"
                    : "Create Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Search className="h-5 w-5 text-gray-400 absolute mt-3 ml-3" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <Card className="p-6 border-0 shadow-md overflow-x-auto">
        {isLoading ? (
          <p>Loading products...</p>
        ) : filteredProducts.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Image
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Price
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Tags
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product._id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    {product.mainImage ? (
                      <div className="relative w-12 h-12">
                        <Image
                          src={product.mainImage}
                          alt={product.name}
                          fill
                          className="object-cover rounded"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No img</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    Rs. {product.retailPrice}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
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
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product._id)}
                      >
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
