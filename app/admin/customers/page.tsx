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
  Store,
  Calendar,
  Package,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp,
  Hash,
  Clock,
  Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  addresses?: { street?: string; city?: string; province?: string }[];
  createdAt: string;
  posOrders?: number;
  totalSpent?: number;
}

interface SaleItem {
  name: string;
  quantity: number;
  price: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

interface POSSaleRecord {
  _id: string;
  saleNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  amountPaid: number;
  change: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: SaleItem[];
}

interface SaleStats {
  totalSales: number;
  totalSpent: number;
  totalItems: number;
  avgOrder: number;
}

type ToastType = "success" | "error" | null;

const PAYMENT_ICONS: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  online: Smartphone,
  manual: Banknote,
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
  card: "bg-blue-50 text-blue-700 border-blue-200",
  online: "bg-purple-50 text-purple-700 border-purple-200",
  manual: "bg-gray-50 text-gray-600 border-gray-200",
};

// ── CSV Download Helper ───────────────────────────────────────────────────────

function downloadCSV(customers: Customer[]) {
  const headers = ["Name", "Email", "Phone", "City", "Street Address", "POS Visits", "Total Spent (Rs)", "Joined"];
  const rows = customers.map((c) => [
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.email}"`,
    `"${c.phone || ""}"`,
    `"${c.addresses?.[0]?.city || ""}"`,
    `"${c.addresses?.[0]?.street || ""}"`,
    c.posOrders ?? 0,
    c.totalSpent ?? 0,
    `"${new Date(c.createdAt).toLocaleDateString("en-PK")}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]); // for download
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<POSSaleRecord[]>([]);
  const [saleStats, setSaleStats] = useState<SaleStats | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  // Debug: show raw API response
  const [debugInfo, setDebugInfo] = useState<string>("");

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

  // Download all customers (fetch all pages)
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/customers?page=1&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        downloadCSV(data.customers || []);
        showToast("success", `Downloaded ${(data.customers || []).length} customers`);
      }
    } catch {
      showToast("error", "Download failed");
    } finally {
      setDownloading(false);
    }
  };

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
    setSalesLoading(true);
    setSales([]);
    setSaleStats(null);
    setExpandedSale(null);
    setDebugInfo("");
    try {
      const res = await fetch(`/api/admin/customers/${c._id}/orders`);
      const data = await res.json();
      console.log("API response for", c.name, ":", data);
      setDebugInfo(JSON.stringify({ status: res.status, salesCount: data.sales?.length, stats: data.stats, error: data.error }, null, 2));
      if (res.ok) {
        setSales(data.sales || []);
        setSaleStats(data.stats || null);
      } else {
        showToast("error", data.error || "Failed to load purchase history");
      }
    } catch (err: any) {
      console.error("Ledger fetch error:", err);
      setDebugInfo("Fetch error: " + err.message);
      showToast("error", "Failed to load purchase history");
    } finally {
      setSalesLoading(false);
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
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white transition-all ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">{total} registered customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            variant="outline"
            className="rounded-xl gap-2 border-2 border-green-200 text-green-700 hover:bg-green-50"
          >
            {downloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
          <Button onClick={openAdd} className="bg-green-700 hover:bg-green-800 rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
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
                <th className="text-left px-5 py-3 font-bold text-gray-500 uppercase text-xs tracking-wide">Customer</th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 uppercase text-xs tracking-wide">Phone</th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 uppercase text-xs tracking-wide">City</th>
                <th className="text-center px-4 py-3 font-bold text-gray-500 uppercase text-xs tracking-wide">POS Visits</th>
                <th className="text-right px-5 py-3 font-bold text-gray-500 uppercase text-xs tracking-wide">Total Spent</th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 uppercase text-xs tracking-wide">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-300" />
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
                  <tr key={c._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-green-700">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-sm">
                      {c.addresses?.[0]?.city || <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200">
                        <Store className="h-3 w-3" />
                        {c.posOrders ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-green-700 text-sm">
                        Rs {(c.totalSpent ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(c.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openLedger(c)}
                          className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500 transition-colors"
                          title="View POS history"
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

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {[
              { key: "name",   label: "Full Name *",   type: "text",  placeholder: "John Doe",             icon: User   },
              { key: "email",  label: "Email *",        type: "email", placeholder: "john@example.com",     icon: Mail   },
              { key: "phone",  label: "Phone",          type: "tel",   placeholder: "+92 300 1234567",       icon: Phone  },
              { key: "city",   label: "City",           type: "text",  placeholder: "Lahore",               icon: MapPin },
              { key: "street", label: "Street Address", type: "text",  placeholder: "House #, Block, Area", icon: MapPin },
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

      {/* ── Customer POS History Dialog ── */}
      <Dialog open={!!viewCustomer} onOpenChange={(o) => !o && setViewCustomer(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {viewCustomer && (
            <>
              {/* Dark header */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 px-6 py-5 text-white shrink-0">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                      <span className="text-2xl font-black">{viewCustomer.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">{viewCustomer.name}</h2>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-white/70 text-xs">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span>{viewCustomer.email}</span>
                        </div>
                        {viewCustomer.phone ? (
                          <div className="flex items-center gap-2 text-white/90 text-xs font-semibold">
                            <Phone className="h-3 w-3 shrink-0 text-white/60" />
                            <span>{viewCustomer.phone}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-white/30 text-xs">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>No phone number</span>
                          </div>
                        )}
                        {(viewCustomer.addresses?.[0]?.street || viewCustomer.addresses?.[0]?.city) ? (
                          <div className="flex items-center gap-2 text-white/70 text-xs">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>
                              {[viewCustomer.addresses?.[0]?.street, viewCustomer.addresses?.[0]?.city]
                                .filter(Boolean).join(", ")}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-white/30 text-xs">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>No address</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>Member since {new Date(viewCustomer.createdAt).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setViewCustomer(null)} className="text-white/50 hover:text-white shrink-0 mt-0.5">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { label: "Total Visits",  value: salesLoading ? "…" : (saleStats?.totalSales ?? 0),                                         icon: Store,     color: "bg-white/10"       },
                    { label: "Total Spent",   value: salesLoading ? "…" : `Rs ${(saleStats?.totalSpent ?? 0).toLocaleString()}`,                  icon: Receipt,   color: "bg-emerald-500/20" },
                    { label: "Avg. Bill",     value: salesLoading ? "…" : `Rs ${Math.round(saleStats?.avgOrder ?? 0).toLocaleString()}`,          icon: TrendingUp,color: "bg-blue-500/20"    },
                    { label: "Items Bought",  value: salesLoading ? "…" : (saleStats?.totalItems ?? 0),                                          icon: Package,   color: "bg-purple-500/20"  },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`${color} rounded-xl p-3 border border-white/10`}>
                      <Icon className="h-3.5 w-3.5 mb-1.5 opacity-60" />
                      <p className="text-base font-black leading-tight">{value}</p>
                      <p className="text-[10px] opacity-50 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="px-6 py-4">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Store className="h-4 w-4 text-purple-500" />
                    POS Purchase History
                  </h3>

                  {/* Debug panel — remove after confirming working */}
                  {/* {debugInfo && (
                    <details className="mb-3 text-xs bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <summary className="cursor-pointer font-bold text-yellow-700">Debug Info (check server logs too)</summary>
                      <pre className="mt-2 text-yellow-800 overflow-auto">{debugInfo}</pre>
                    </details>
                  )} */}

                  {salesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                      <p className="text-sm text-gray-400">Loading purchase history…</p>
                    </div>
                  ) : sales.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-semibold">No POS purchases found</p>
                      <p className="text-xs mt-1 opacity-60 max-w-xs mx-auto">
                        Check debug info above and server terminal for details
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {sales.map((sale) => {
                        const PayIcon = PAYMENT_ICONS[sale.paymentMethod] || Banknote;
                        const isExpanded = expandedSale === sale._id;
                        const payColor = PAYMENT_COLORS[sale.paymentMethod] || "bg-gray-50 text-gray-600 border-gray-200";

                        return (
                          <div key={sale._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
                            <button
                              onClick={() => setExpandedSale(isExpanded ? null : sale._id)}
                              className="w-full text-left"
                            >
                              <div className="flex items-center gap-3 px-4 py-3.5">
                                <div className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center shrink-0">
                                  <Receipt className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-gray-900 text-sm flex items-center gap-1">
                                      <Hash className="h-3 w-3 text-gray-400" />
                                      {sale.saleNumber}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${payColor}`}>
                                      <PayIcon className="h-2.5 w-2.5" />
                                      {sale.paymentMethod.toUpperCase()}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {sale.paymentStatus}
                                    </span>
                                    {sale.discount > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                                        -{sale.discount.toLocaleString()} off
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(sale.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                                      {" · "}
                                      {new Date(sale.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    <span>{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className="font-black text-gray-900 text-lg leading-tight">Rs {sale.total.toLocaleString()}</p>
                                    {sale.tax > 0 && <p className="text-[10px] text-gray-400">incl. Rs {sale.tax} tax</p>}
                                  </div>
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50/50">
                                <div className="px-4 pt-3 pb-2">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Items Purchased</p>
                                  <div className="space-y-1.5">
                                    {sale.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                            <Package className="h-3.5 w-3.5 text-slate-500" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                            {item.taxRate != null && item.taxRate > 0 && (
                                              <p className="text-[10px] text-blue-500">GST {item.taxRate}% = Rs {(item.taxAmount ?? 0).toFixed(0)}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm shrink-0">
                                          <span className="text-gray-400 text-xs">{item.quantity} × Rs {item.price.toLocaleString()}</span>
                                          <span className="font-bold text-gray-900 min-w-[64px] text-right">Rs {item.total.toLocaleString()}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="mx-4 mb-4 mt-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                  <div className="px-4 py-3 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-500">
                                      <span>Subtotal</span><span>Rs {sale.subtotal.toLocaleString()}</span>
                                    </div>
                                    {sale.tax > 0 && (
                                      <div className="flex justify-between text-gray-500">
                                        <span>GST / Tax</span><span className="text-blue-600">Rs {sale.tax.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {sale.discount > 0 && (
                                      <div className="flex justify-between text-orange-600 font-semibold">
                                        <span>Discount</span><span>− Rs {sale.discount.toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 flex justify-between items-center">
                                    <span className="font-black text-sm text-gray-800">Total</span>
                                    <span className="font-black text-base text-green-700">Rs {sale.total.toLocaleString()}</span>
                                  </div>
                                  <div className="border-t border-gray-100 px-4 py-2.5 grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Amount Paid</span>
                                      <span className="font-semibold text-gray-900">Rs {sale.amountPaid.toLocaleString()}</span>
                                    </div>
                                    {sale.change > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Change</span>
                                        <span className="font-semibold text-blue-600">Rs {sale.change.toLocaleString()}</span>
                                      </div>
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