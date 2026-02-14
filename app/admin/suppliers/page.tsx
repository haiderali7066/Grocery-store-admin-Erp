"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  History,
  X,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PurchaseHistory {
  _id: string;
  createdAt: string;
  supplierInvoiceNo: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
}

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email: string;
  balance: number;
  purchases?: PurchaseHistory[];
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const formatCurrency = (amount: number | undefined | null) => {
    return (amount ?? 0).toFixed(2);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/admin/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      } else {
        console.error("Failed to fetch suppliers");
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupplierDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSupplier(data.supplier);
        setIsHistoryOpen(true);
      } else {
        alert("Could not fetch supplier details");
      }
    } catch (error) {
      console.error("Error fetching supplier details:", error);
      alert("Could not fetch history");
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("Supplier name is required");
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
        alert("Supplier created successfully!");
        setFormData({ name: "", phone: "", email: "", address: "", city: "" });
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        const error = await res.json();
        alert(`Failed to create supplier: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating supplier:", error);
      alert("Error creating supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}" and all their purchase history?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Supplier deleted successfully");
        fetchSuppliers();
      } else {
        const error = await res.json();
        alert(`Failed to delete: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("Error deleting supplier");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Loading suppliers...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Supplier Directory
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage accounts payable and procurement history
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
        >
          <Plus className="h-5 w-5 mr-2" /> Add New Supplier
        </Button>
      </div>

      {/* Suppliers Grid */}
      {suppliers.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No Suppliers Yet
          </h3>
          <p className="text-gray-500 mb-6">
            Add your first supplier to start tracking purchases
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Supplier
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <Card
              key={supplier._id}
              className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all"
            >
              <div
                className={`h-2 w-full ${(supplier.balance ?? 0) > 0 ? "bg-red-500" : "bg-green-500"}`}
              />
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 truncate pr-4">
                    {supplier.name}
                  </h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        router.push(`/admin/suppliers/${supplier._id}`)
                      }
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(supplier._id, supplier.name)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="p-2 bg-slate-100 rounded-full">
                      <Phone className="h-3 w-3" />
                    </div>
                    {supplier.phone || "No phone"}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="p-2 bg-slate-100 rounded-full">
                      <Mail className="h-3 w-3" />
                    </div>
                    {supplier.email || "No email"}
                  </div>
                </div>

                {/* Balance Card */}
                <div
                  className={`p-4 rounded-xl mb-4 ${(supplier.balance ?? 0) > 0 ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}
                >
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Outstanding Balance
                  </p>
                  <div className="flex justify-between items-end">
                    <p
                      className={`text-2xl font-black ${(supplier.balance ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      Rs {formatCurrency(Math.abs(supplier.balance ?? 0))}
                    </p>
                    <span className="text-[10px] font-bold text-gray-400">
                      {(supplier.balance ?? 0) > 0 ? "WE OWE" : "CREDIT"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 font-bold"
                  onClick={() => fetchSupplierDetails(supplier._id)}
                >
                  <History className="h-4 w-4 mr-2" /> View Purchase History
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Supplier Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Supplier Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="ABC Traders"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="0300-1234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="supplier@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Shop 123, Market Street"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="Lahore"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Creating..." : "Create Supplier"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData({
                    name: "",
                    phone: "",
                    email: "",
                    address: "",
                    city: "",
                  });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase History Modal */}
      {isHistoryOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedSupplier.name}
                </h2>
                <p className="text-sm text-slate-500">
                  Purchase History & Account Statement
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsHistoryOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedSupplier.purchases && selectedSupplier.purchases.length > 0 ? (
                <table className="w-full">
                  <thead className="text-left text-xs uppercase text-gray-400 font-bold border-b">
                    <tr>
                      <th className="pb-4">Date</th>
                      <th className="pb-4">Invoice #</th>
                      <th className="pb-4">Total Bill</th>
                      <th className="pb-4">Paid</th>
                      <th className="pb-4">Method</th>
                      <th className="pb-4 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedSupplier.purchases.map((p) => (
                      <tr
                        key={p._id}
                        className="text-sm hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-4 text-gray-600">
                          {format(new Date(p.createdAt), "dd MMM yyyy")}
                        </td>
                        <td className="py-4 font-mono font-bold">
                          {p.supplierInvoiceNo || "N/A"}
                        </td>
                        <td className="py-4 font-semibold">
                          Rs {formatCurrency(p.totalAmount)}
                        </td>
                        <td className="py-4 text-green-600 font-medium">
                          Rs {formatCurrency(p.amountPaid)}
                        </td>
                        <td className="py-4 text-gray-500 uppercase text-xs">
                          {p.paymentMethod}
                        </td>
                        <td
                          className={`py-4 text-right font-bold ${(p.balanceDue ?? 0) > 0 ? "text-red-500" : "text-gray-900"}`}
                        >
                          Rs {formatCurrency(p.balanceDue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No purchase history yet</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-lg opacity-80">
                Total Outstanding Balance:
              </span>
              <span
                className={`text-3xl font-black ${(selectedSupplier.balance ?? 0) > 0 ? "text-red-400" : "text-green-400"}`}
              >
                Rs {formatCurrency(Math.abs(selectedSupplier.balance ?? 0))}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}