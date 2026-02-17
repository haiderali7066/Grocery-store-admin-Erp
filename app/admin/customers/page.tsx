"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  X,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  addresses?: { street?: string; city?: string }[];
  createdAt: string;
  totalOrders?: number;
  totalSpent?: number;
}

interface OrderSummary {
  _id: string;
  orderNumber: string;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: { name?: string; quantity: number; price: number }[];
}

type ToastType = "success" | "error" | null;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  verified: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialogs
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<OrderSummary[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [toast, setToast] = useState<{ type: ToastType; message: string }>({
    type: null,
    message: "",
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    street: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 3500);
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
      }
    } catch {
      showToast("error", "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [page, search]);

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      city: c.addresses?.[0]?.city || "",
      street: c.addresses?.[0]?.street || "",
    });
    setShowForm(true);
  };

  const openAdd = () => {
    setEditCustomer(null);
    setForm({ name: "", email: "", phone: "", city: "", street: "" });
    setShowForm(true);
  };

  const openLedger = async (c: Customer) => {
    setViewCustomer(c);
    setLedgerLoading(true);
    setLedger([]);
    try {
      const res = await fetch(`/api/admin/customers/${c._id}/orders`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data.orders || []);
      }
    } catch {
      showToast("error", "Failed to load order history");
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      showToast("error", "Name and email are required");
      return;
    }
    setFormLoading(true);
    try {
      const url = editCustomer
        ? `/api/admin/customers/${editCustomer._id}`
        : "/api/admin/customers";
      const method = editCustomer ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          addresses: [{ street: form.street, city: form.city }],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }
      showToast("success", editCustomer ? "Customer updated!" : "Customer created!");
      setShowForm(false);
      fetchCustomers();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("success", "Customer deleted");
      fetchCustomers();
    } catch {
      showToast("error", "Failed to delete customer");
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast.type && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} registered customers
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-green-700 hover:bg-green-800 rounded-xl gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-bold text-gray-500">Customer</th>
                <th className="text-left px-5 py-3 font-bold text-gray-500">Contact</th>
                <th className="text-left px-5 py-3 font-bold text-gray-500">City</th>
                <th className="text-right px-5 py-3 font-bold text-gray-500">Orders</th>
                <th className="text-right px-5 py-3 font-bold text-gray-500">Total Spent</th>
                <th className="text-left px-5 py-3 font-bold text-gray-500">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No customers found</p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-green-700">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-600">{c.email}</p>
                      {c.phone && (
                        <p className="text-gray-400 text-xs">{c.phone}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {c.addresses?.[0]?.city || "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {c.totalOrders ?? 0}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-green-700">
                      Rs. {(c.totalSpent ?? 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(c.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openLedger(c)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                          title="View ledger"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c._id, c.name)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {[
              { key: "name", label: "Full Name *", type: "text", placeholder: "John Doe", icon: User },
              { key: "email", label: "Email *", type: "email", placeholder: "john@example.com", icon: Mail },
              { key: "phone", label: "Phone", type: "tel", placeholder: "+92 300 1234567", icon: Phone },
              { key: "city", label: "City", type: "text", placeholder: "Lahore", icon: MapPin },
              { key: "street", label: "Street Address", type: "text", placeholder: "House #, Block, Area", icon: MapPin },
            ].map(({ key, label, type, placeholder, icon: Icon }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={type}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={formLoading}
                className="flex-1 bg-green-700 hover:bg-green-800 rounded-xl"
              >
                {formLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editCustomer ? (
                  "Save Changes"
                ) : (
                  "Create Customer"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Customer Ledger Dialog ── */}
      <Dialog open={!!viewCustomer} onOpenChange={(o) => !o && setViewCustomer(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-green-600" />
                Customer Ledger
              </DialogTitle>
              <button
                onClick={() => setViewCustomer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          {viewCustomer && (
            <div className="flex-1 overflow-y-auto">
              {/* Customer summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-black text-green-700">
                      {viewCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{viewCustomer.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {viewCustomer.email}
                      </span>
                      {viewCustomer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {viewCustomer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-white rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-400">Total Orders</p>
                    <p className="font-black text-gray-900">{viewCustomer.totalOrders ?? ledger.length}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-400">Total Spent</p>
                    <p className="font-black text-green-700">
                      Rs. {ledger.reduce((s, o) => s + o.total, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-400">Avg Order</p>
                    <p className="font-black text-blue-700">
                      Rs.{" "}
                      {ledger.length > 0
                        ? Math.round(
                            ledger.reduce((s, o) => s + o.total, 0) / ledger.length
                          ).toLocaleString()
                        : 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order history */}
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                Order History
              </h3>

              {ledgerLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : ledger.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ledger.map((order) => (
                    <div
                      key={order._id}
                      className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">
                            #{order.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              STATUS_COLORS[order.orderStatus] || "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {order.orderStatus}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              STATUS_COLORS[order.paymentStatus] || "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                        <p className="font-black text-green-700 text-sm">
                          Rs. {order.total.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""} ·{" "}
                          {order.paymentMethod}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString("en-PK", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                      {/* Item names */}
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {order.items.map((i) => i.name || "Item").join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}