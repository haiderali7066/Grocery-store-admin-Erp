"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Phone, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email: string;
  balance: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/admin/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ name: "", phone: "", email: "" });
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        alert("Failed to create supplier");
      }
    } catch (error) {
      console.error(error);
      alert("Error creating supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      try {
        const res = await fetch(`/api/admin/suppliers/${id}`, {
          method: "DELETE",
        });
        if (res.ok) fetchSuppliers();
      } catch (error) {
        console.error("Failed to delete supplier:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">
            Manage supplier information and ledgers
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-700 hover:bg-green-800 rounded-full"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <Card key={supplier._id} className="p-6 border-0 shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {supplier.name}
            </h3>

            <div className="space-y-2 mb-4">
              {supplier.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" /> {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" /> {supplier.email}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-xs text-gray-600">Current Balance</p>
              <p className="text-lg font-bold text-gray-900">
                Rs. {supplier.balance.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2">
              {/* EDIT */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent"
                onClick={() => router.push(`/admin/suppliers/${supplier._id}`)}
              >
                <Edit className="h-4 w-4" />
              </Button>

              {/* DELETE */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(supplier._id)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {isLoading && (
        <p className="text-center text-gray-500">Loading suppliers...</p>
      )}
      {!isLoading && suppliers.length === 0 && (
        <p className="text-center text-gray-500 py-12">No suppliers found</p>
      )}

      {/* Create Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-2xl font-bold mb-4">Add New Supplier</h2>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Supplier Name</label>
                <Input
                  placeholder="Enter supplier name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  placeholder="Enter email (optional)"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-green-700 hover:bg-green-800 rounded-full"
                >
                  {isSubmitting ? "Creating..." : "Create Supplier"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ name: "", phone: "", email: "" });
                  }}
                  className="flex-1 rounded-full bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
