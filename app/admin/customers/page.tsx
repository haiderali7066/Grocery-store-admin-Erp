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
  Loader2,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Store,
  Calendar,
  DollarSign,
  Package,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  ChevronUp,
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
  onlineOrders?: number;
  posOrders?: number;
}

interface OrderItem {
  name?: string;
  quantity: number;
  price: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
}

interface OrderSummary {
  _id: string;
  orderNumber: string;
  type: "online" | "pos";
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  shippingCost?: number;
  amountPaid?: number;
  change?: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

interface LedgerStats {
  totalOrders: number;
  onlineCount: number;
  posCount: number;
  totalSpent: number;
  totalOnlineSpent: number;
  totalPosSpent: number;
}

type ToastType = "success" | "error" | null;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-purple-100 text-purple-700 border-purple-200",
  shipped: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  verified: "bg-green-100 text-green-700 border-green-200",
  failed: "bg-red-100 text-red-700 border-red-200",
};

const PAYMENT_ICONS: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  online: Smartphone,
  cod: Banknote,
  bank: CreditCard,
  easypaisa: Smartphone,
  jazzcash: Smartphone,
  manual: Banknote,
  walkin: Banknote,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<OrderSummary[]>([]);
  const [ledgerStats, setLedgerStats] = useState<LedgerStats | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "online" | "pos">("all");

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

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

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
    setLedgerStats(null);
    setExpandedOrder(null);
    setLedgerFilter("all");
    try {
      const res = await fetch(`/api/admin/customers/${c._id}/orders`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data.orders || []);
        setLedgerStats(data.stats || null);
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
  const filteredLedger = ledger.filter((o) =>
    ledgerFilter === "all" ? true : o.type === ledgerFilter,
  );
  const filteredTotal = filteredLedger.reduce((s, o) => s + o.total, 0);
  const avgOrder = filteredLedger.length > 0 ? filteredTotal / filteredLedger.length : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast.type && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white transition-all ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">{total} registered customers</p>
        </div>
        <Button onClick={openAdd} className="bg-green-700 hover:bg-green-800 rounded-xl gap-2">
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
                <th className="text-center px-4 py-3 font-bold text-gray-500">Online</th>
                <th className="text-center px-4 py-3 font-bold text-gray-500">POS</th>
                <th className="text-right px-5 py-3 font-bold text-gray-500">Total Spent</th>
                <th className="text-left px-5 py-3 font-bold text-gray-500">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No customers found</p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
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
                      {c.phone && <p className="text-gray-400 text-xs">{c.phone}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{c.addresses?.[0]?.city || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        <ShoppingCart className="h-3 w-3" />
                        {c.onlineOrders ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        <Store className="h-3 w-3" />
                        {c.posOrders ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-green-700">
                      Rs. {(c.totalSpent ?? 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(c.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openLedger(c)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="View ledger">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(c._id, c.name)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Delete">
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg">Previous</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg">Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
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
              <Button onClick={handleSave} disabled={formLoading} className="flex-1 bg-green-700 hover:bg-green-800 rounded-xl">
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : editCustomer ? "Save Changes" : "Create Customer"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Customer Ledger Dialog ── */}
      <Dialog open={!!viewCustomer} onOpenChange={(o) => !o && setViewCustomer(null)}>
        <DialogContent className="rounded-2xl max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {viewCustomer && (
            <>
              {/* Green header */}
              <div className="bg-gradient-to-r from-green-700 to-emerald-600 px-6 py-5 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
                      <span className="text-2xl font-black">{viewCustomer.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black">{viewCustomer.name}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-white/80 text-xs">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{viewCustomer.email}</span>
                        {viewCustomer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{viewCustomer.phone}</span>}
                        {viewCustomer.addresses?.[0]?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{viewCustomer.addresses[0].city}</span>}
                      </div>
                      {viewCustomer.addresses?.[0]?.street && (
                        <p className="text-white/60 text-xs mt-0.5">{viewCustomer.addresses[0].street}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setViewCustomer(null)} className="text-white/70 hover:text-white shrink-0">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  {[
                    { label: "All Orders", value: ledgerStats?.totalOrders ?? ledger.length, icon: ShoppingBag },
                    { label: "Online", value: ledgerStats?.onlineCount ?? 0, icon: ShoppingCart },
                    { label: "POS Sales", value: ledgerStats?.posCount ?? 0, icon: Store },
                    { label: "Total Spent", value: `Rs ${(ledgerStats?.totalSpent ?? 0).toLocaleString()}`, icon: DollarSign },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <Icon className="h-4 w-4 mb-1 opacity-70" />
                      <p className="text-lg font-black leading-tight">{value}</p>
                      <p className="text-[10px] opacity-70">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {/* Secondary stats */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">Avg. Order</p>
                      <p className="font-black text-blue-700">Rs {avgOrder > 0 ? Math.round(avgOrder).toLocaleString() : "0"}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">Online Spent</p>
                      <p className="font-black text-blue-600">Rs {(ledgerStats?.totalOnlineSpent ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">POS Spent</p>
                      <p className="font-black text-purple-600">Rs {(ledgerStats?.totalPosSpent ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">Member Since</p>
                      <p className="font-bold text-gray-700 text-sm">
                        {new Date(viewCustomer.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* History */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Purchase History</h3>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                      {(["all", "online", "pos"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setLedgerFilter(f)}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                            ledgerFilter === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {f === "all" ? "All" : f === "online" ? "Online" : "POS"}
                          <span className="ml-1 opacity-60">
                            ({f === "all" ? ledger.length : f === "online" ? (ledgerStats?.onlineCount ?? 0) : (ledgerStats?.posCount ?? 0)})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {ledgerLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                      <p className="text-sm text-gray-400">Loading purchase history…</p>
                    </div>
                  ) : filteredLedger.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No {ledgerFilter !== "all" ? ledgerFilter : ""} orders found</p>
                      {ledgerFilter === "pos" && (ledgerStats?.posCount ?? 0) === 0 && (
                        <p className="text-xs mt-1 opacity-70">POS sales appear here only when a customer is selected at checkout</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredLedger.map((order) => {
                        const PayIcon = PAYMENT_ICONS[order.paymentMethod] || Banknote;
                        const isExpanded = expandedOrder === order._id;
                        return (
                          <div key={order._id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                            <button
                              onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                              className="w-full text-left"
                            >
                              <div className="flex items-center gap-3 px-4 py-3">
                                <div className={`p-2 rounded-lg shrink-0 ${order.type === "pos" ? "bg-purple-100" : "bg-blue-100"}`}>
                                  {order.type === "pos"
                                    ? <Store className="h-4 w-4 text-purple-600" />
                                    : <ShoppingCart className="h-4 w-4 text-blue-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.orderStatus] || "bg-gray-100 text-gray-500"}`}>
                                      {order.orderStatus}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.paymentStatus] || "bg-gray-100 text-gray-500"}`}>
                                      {order.paymentStatus}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${order.type === "pos" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                                      {order.type === "pos" ? "POS" : "Online"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(order.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                    <span className="flex items-center gap-1"><PayIcon className="h-3 w-3" />{order.paymentMethod}</span>
                                    <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-black text-green-700 text-base">Rs {order.total.toLocaleString()}</span>
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50">
                                {/* Items */}
                                <div className="px-4 pt-3 pb-2">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                                  <div className="space-y-1.5">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Package className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                          <span className="text-sm font-medium text-gray-800 truncate">{item.name || "Item"}</span>
                                          {item.taxRate != null && item.taxRate > 0 && (
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded shrink-0">+{item.taxRate}% tax</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-500 shrink-0">
                                          <span>{item.quantity} × Rs {item.price.toLocaleString()}</span>
                                          <span className="font-bold text-gray-900">
                                            Rs {(item.subtotal ?? item.quantity * item.price).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Summary */}
                                <div className="px-4 pb-3 pt-2 border-t border-gray-100">
                                  <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-1.5 text-xs">
                                    {order.subtotal != null && (
                                      <div className="flex justify-between text-gray-500">
                                        <span>Subtotal</span><span>Rs {order.subtotal.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {order.tax != null && order.tax > 0 && (
                                      <div className="flex justify-between text-gray-500">
                                        <span>Tax</span><span>Rs {order.tax.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {order.discount != null && order.discount > 0 && (
                                      <div className="flex justify-between text-orange-600">
                                        <span>Discount</span><span>− Rs {order.discount.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {order.shippingCost != null && order.shippingCost > 0 && (
                                      <div className="flex justify-between text-gray-500">
                                        <span>Shipping</span><span>Rs {order.shippingCost.toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-1.5">
                                      <span>Total</span>
                                      <span className="text-green-700">Rs {order.total.toLocaleString()}</span>
                                    </div>
                                    {order.type === "pos" && order.amountPaid != null && (
                                      <>
                                        <div className="flex justify-between text-gray-500">
                                          <span>Paid</span><span>Rs {order.amountPaid.toLocaleString()}</span>
                                        </div>
                                        {order.change != null && order.change > 0 && (
                                          <div className="flex justify-between text-blue-600 font-semibold">
                                            <span>Change</span><span>Rs {order.change.toLocaleString()}</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}