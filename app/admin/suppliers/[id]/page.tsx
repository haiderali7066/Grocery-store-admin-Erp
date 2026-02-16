"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  contact: string;
}

export default function EditSupplierPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    contact: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSupplier(data.supplier);
        setFormData({
          name: data.supplier.name || "",
          phone: data.supplier.phone || "",
          email: data.supplier.email || "",
          address: data.supplier.address || "",
          city: data.supplier.city || "",
          contact: data.supplier.contact || "",
        });
      } else {
        alert("Failed to fetch supplier");
        router.push("/admin/suppliers");
      }
    } catch (error) {
      console.error("Failed to fetch supplier:", error);
      alert("Error loading supplier");
      router.push("/admin/suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Supplier name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("Supplier updated successfully!");
        router.push("/admin/suppliers");
      } else {
        const error = await res.json();
        alert(`Failed to update supplier: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Error updating supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Loading supplier...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-red-600">Supplier not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Button
        variant="outline"
        onClick={() => router.push("/admin/suppliers")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Suppliers
      </Button>

      <Card className="p-8 shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">Edit Supplier</h2>
        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Supplier Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="h-12"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                value={formData.email}
                type="email"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="h-12"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <Input
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="h-12"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Contact Person
              </label>
              <Input
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                className="h-12"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold"
            >
              {isSubmitting ? "Updating..." : "Update Supplier"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/suppliers")}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
