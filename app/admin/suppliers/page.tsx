// app/admin/suppliers/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
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
  DollarSign,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  Hash,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PurchaseHistory {
  _id: string;
  createdAt: string;
  supplierInvoiceNo: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  paymentStatus: string;
  products?: {
    product: { name: string; sku: string };
    quantity: number;
    buyingRate: number;
    unitCostWithTax: number;
    sellingPrice: number;
    taxType?: string;
    taxValue?: number;
    freightPerUnit?: number;
  }[];
  notes?: string;
}

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  balance: number;
  purchases?: PurchaseHistory[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HISTORY_PER_PAGE = 10;

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3 w-3" />,
  bank: <CreditCard className="h-3 w-3" />,
  easypaisa: <Smartphone className="h-3 w-3" />,
  jazzcash: <Smartphone className="h-3 w-3" />,
  cheque: <CreditCard className="h-3 w-3" />,
};

const PAYMENT_PILLS: Record<string, string> = {
  cash: "bg-green-50 text-green-700 border-green-200",
  bank: "bg-blue-50 text-blue-700 border-blue-200",
  easypaisa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  jazzcash: "bg-orange-50 text-orange-700 border-orange-200",
  cheque: "bg-gray-50 text-gray-700 border-gray-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number | undefined | null) => (n ?? 0).toFixed(2);
const fmtDate = (d: string) => format(new Date(d), "dd MMM yyyy");
const fmtTime = (d: string) => format(new Date(d), "hh:mm a");

// ── Pagination Component ──────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60 rounded-b-xl no-print">
      <p className="text-xs text-gray-500 font-medium">
        Showing <span className="font-bold text-gray-800">{start}–{end}</span> of <span className="font-bold text-gray-800">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1}
          className="px-2 py-1 rounded-lg border text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="p-1.5 rounded-lg border text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`e${i}`} className="px-1.5 text-gray-400 text-xs">…</span>
          ) : (
            <button key={page} onClick={() => onPageChange(page as number)}
              className={`min-w-[28px] px-2 py-1 rounded-lg text-xs font-bold transition-all ${page === currentPage ? "bg-blue-600 text-white shadow-sm" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
              {page}
            </button>
          )
        )}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}
          className="px-2 py-1 rounded-lg border text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
      </div>
    </div>
  );
}

// ── Print styles injected globally ───────────────────────────────────────────

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #supplier-print-area, #supplier-print-area * { visibility: visible !important; }
  #supplier-print-area { position: fixed !important; top: 0; left: 0; width: 100%; z-index: 99999; background: white; padding: 24px; }
  .no-print { display: none !important; }
  @page { margin: 1.5cm; size: A4; }
}
`;

// ── Main Component ────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({ name: "", phone: "", email: "", address: "", city: "" });
  const [paymentData, setPaymentData] = useState({ amount: "", paymentSource: "cash", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const router = useRouter();

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/admin/suppliers");
      if (res.ok) { const data = await res.json(); setSuppliers(data.suppliers || []); }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const fetchSupplierDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSupplier(data.supplier);
        setHistoryPage(1);
        setExpandedRows(new Set());
        setIsHistoryOpen(true);
      } else { alert("Could not fetch supplier details"); }
    } catch (e) { alert("Could not fetch history"); }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { alert("Supplier name is required"); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ name: "", phone: "", email: "", address: "", city: "" });
        setIsModalOpen(false);
        fetchSuppliers();
      } else { const err = await res.json(); alert(`Failed: ${err.error || "Unknown error"}`); }
    } catch { alert("Error creating supplier"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}" and all their purchase history?`)) return;
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, { method: "DELETE" });
      if (res.ok) { fetchSuppliers(); }
      else { const err = await res.json(); alert(`Failed: ${err.error || "Unknown error"}`); }
    } catch { alert("Error deleting supplier"); }
  };

  const handlePaySupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setPaymentData({ amount: supplier.balance?.toString() || "", paymentSource: "cash", notes: "" });
    setIsPaymentOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedSupplier) return;
    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) { alert("Please enter a valid amount"); return; }
    if (amount > (selectedSupplier.balance || 0)) {
      alert(`Amount cannot exceed outstanding balance of Rs. ${fmt(selectedSupplier.balance)}`);
      return;
    }
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${selectedSupplier._id}/pay`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Payment failed"); }
      const data = await res.json();
      alert(`✅ ${data.message}\n\nPrevious Balance: Rs. ${data.supplier.previousBalance.toLocaleString()}\nAmount Paid: Rs. ${data.supplier.amountPaid.toLocaleString()}\nNew Balance: Rs. ${data.supplier.newBalance.toLocaleString()}`);
      setIsPaymentOpen(false);
      setSelectedSupplier(null);
      setPaymentData({ amount: "", paymentSource: "cash", notes: "" });
      fetchSuppliers();
    } catch (err: any) { alert("Payment failed: " + err.message); }
    finally { setIsProcessingPayment(false); }
  };

  // ── History pagination + stats ─────────────────────────────────────────────

  const purchases = selectedSupplier?.purchases || [];

  const stats = useMemo(() => {
    return purchases.reduce((acc, p) => ({
      totalOrders: acc.totalOrders + 1,
      totalBilled: acc.totalBilled + p.totalAmount,
      totalPaid: acc.totalPaid + p.amountPaid,
      totalDue: acc.totalDue + p.balanceDue,
      totalItems: acc.totalItems + (p.products?.reduce((s, pr) => s + pr.quantity, 0) ?? 0),
    }), { totalOrders: 0, totalBilled: 0, totalPaid: 0, totalDue: 0, totalItems: 0 });
  }, [purchases]);

  const totalHistoryPages = Math.ceil(purchases.length / HISTORY_PER_PAGE);
  const paginatedPurchases = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PER_PAGE;
    return purchases.slice(start, start + HISTORY_PER_PAGE);
  }, [purchases, historyPage]);

  const handlePrint = () => {
    window.print();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Loading suppliers...</p>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Supplier Directory</h1>
            <p className="text-gray-500 text-sm mt-1">Manage accounts payable and procurement history</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 h-12 px-6">
            <Plus className="h-5 w-5 mr-2" /> Add New Supplier
          </Button>
        </div>

        {/* Suppliers Grid */}
        {suppliers.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Suppliers Yet</h3>
            <p className="text-gray-500 mb-6">Add your first supplier to start tracking purchases</p>
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> Add Supplier
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <Card key={supplier._id} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all">
                <div className={`h-2 w-full ${(supplier.balance ?? 0) > 0 ? "bg-red-500" : "bg-green-500"}`} />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 truncate pr-4">{supplier.name}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/suppliers/${supplier._id}`)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier._id, supplier.name)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="p-2 bg-slate-100 rounded-full"><Phone className="h-3 w-3" /></div>
                      {supplier.phone || "No phone"}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="p-2 bg-slate-100 rounded-full"><Mail className="h-3 w-3" /></div>
                      {supplier.email || "No email"}
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl mb-4 ${(supplier.balance ?? 0) > 0 ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Outstanding Balance</p>
                    <div className="flex justify-between items-end">
                      <p className={`text-2xl font-black ${(supplier.balance ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                        Rs {fmt(Math.abs(supplier.balance ?? 0))}
                      </p>
                      <span className="text-[10px] font-bold text-gray-400">
                        {(supplier.balance ?? 0) > 0 ? "WE OWE" : "CREDIT"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(supplier.balance ?? 0) > 0 && (
                      <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold" onClick={() => handlePaySupplier(supplier)}>
                        <DollarSign className="h-4 w-4 mr-2" /> Pay Supplier
                      </Button>
                    )}
                    <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 font-bold" onClick={() => fetchSupplierDetails(supplier._id)}>
                      <History className="h-4 w-4 mr-2" /> Purchase History
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Supplier Dialog ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-4 mt-4">
            {[
              { label: "Supplier Name *", key: "name", placeholder: "ABC Traders", required: true },
              { label: "Phone", key: "phone", placeholder: "0300-1234567" },
              { label: "Email", key: "email", placeholder: "supplier@example.com", type: "email" },
              { label: "Address", key: "address", placeholder: "Shop 123, Market Street" },
              { label: "City", key: "city", placeholder: "Lahore" },
            ].map(({ label, key, placeholder, required, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <Input type={type || "text"} value={(formData as any)[key]}
                  onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                  placeholder={placeholder} required={required} />
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? "Creating..." : "Create Supplier"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setFormData({ name: "", phone: "", email: "", address: "", city: "" }); }} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Payment Dialog ── */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Supplier</DialogTitle>
            <DialogDescription>Make a payment to <span className="font-bold">{selectedSupplier?.name}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800"><span className="font-bold">Outstanding Balance:</span> Rs. {fmt(selectedSupplier?.balance)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (Rs) <span className="text-red-500">*</span></label>
              <Input type="number" value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} placeholder="Enter amount" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Source <span className="text-red-500">*</span></label>
              <select value={paymentData.paymentSource} onChange={e => setPaymentData({ ...paymentData, paymentSource: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="jazzcash">JazzCash</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <Textarea value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })} placeholder="e.g., Payment for Invoice #123" rows={3} />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">💡 This will deduct Rs. {paymentData.amount || "0"} from your {paymentData.paymentSource} wallet and reduce the supplier balance.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)} disabled={isProcessingPayment}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSubmitPayment} disabled={isProcessingPayment}>
              {isProcessingPayment ? "Processing..." : "Make Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════ HISTORY & REPORT MODAL ════════════════════════════════ */}
      {isHistoryOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b bg-slate-50 flex items-center justify-between no-print">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-black">
                  {selectedSupplier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{selectedSupplier.name}</h2>
                  <p className="text-sm text-gray-500">Purchase History & Account Report</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handlePrint} variant="outline" className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50">
                  <Printer className="h-4 w-4" /> Print Report
                </Button>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Printable Content ── */}
            <div id="supplier-print-area" className="flex-1 overflow-y-auto">

              {/* Print-only header */}
              <div className="hidden print:block px-8 pt-6 pb-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-gray-900">{selectedSupplier.name}</h1>
                    <p className="text-gray-500 text-sm">Supplier Account Statement</p>
                    {selectedSupplier.phone && <p className="text-gray-500 text-xs mt-1">📞 {selectedSupplier.phone}</p>}
                    {selectedSupplier.email && <p className="text-gray-500 text-xs">✉️ {selectedSupplier.email}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Generated</p>
                    <p className="text-sm font-bold text-gray-700">{format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
                    <p className="text-xs text-gray-400 mt-2">Total Transactions</p>
                    <p className="text-2xl font-black text-gray-900">{purchases.length}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">

                {/* ── KPI Summary Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Total Orders",    value: stats.totalOrders,                    icon: <Receipt className="h-4 w-4" />,    color: "bg-slate-50 border-slate-200 text-slate-700" },
                    { label: "Total Billed",    value: `Rs ${fmt(stats.totalBilled)}`,        icon: <FileText className="h-4 w-4" />,   color: "bg-blue-50 border-blue-200 text-blue-800" },
                    { label: "Total Paid",      value: `Rs ${fmt(stats.totalPaid)}`,          icon: <TrendingUp className="h-4 w-4" />, color: "bg-green-50 border-green-200 text-green-800" },
                    { label: "Balance Due",     value: `Rs ${fmt(stats.totalDue)}`,           icon: <TrendingDown className="h-4 w-4" />, color: stats.totalDue > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-gray-50 border-gray-200 text-gray-400" },
                    { label: "Items Purchased", value: stats.totalItems.toLocaleString(),     icon: <Building2 className="h-4 w-4" />, color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
                  ].map((s, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${s.color}`}>
                      <div className="flex items-center gap-1.5 mb-2 opacity-70">{s.icon}<span className="text-[10px] font-black uppercase tracking-wide">{s.label}</span></div>
                      <p className="text-lg font-black leading-tight">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Supplier contact info (print) ── */}
                <div className="hidden print:grid grid-cols-3 gap-4 text-sm">
                  {[
                    { label: "Phone", value: selectedSupplier.phone || "—" },
                    { label: "Email", value: selectedSupplier.email || "—" },
                    { label: "City",  value: selectedSupplier.city  || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-1">{label}</p>
                      <p className="font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Purchase History Table ── */}
                {purchases.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                    <History className="h-14 w-14 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-semibold">No purchase history yet</p>
                    <p className="text-gray-400 text-sm mt-1">Purchases made with this supplier will appear here</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {/* Table header bar */}
                    <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 opacity-70" />
                        <span className="font-black text-sm">All Purchase Orders</span>
                        <span className="text-xs opacity-50 ml-1">— {purchases.length} total</span>
                      </div>
                      <span className="text-xs opacity-50 no-print">{HISTORY_PER_PAGE} per page</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase w-8">#</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Invoice</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Total Bill</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Paid</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Balance</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Method</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase no-print">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedPurchases.map((p, idx) => {
                            const globalIdx = (historyPage - 1) * HISTORY_PER_PAGE + idx + 1;
                            const isExpanded = expandedRows.has(p._id);
                            const totalQty = p.products?.reduce((s, pr) => s + pr.quantity, 0) ?? 0;
                            const methodKey = (p.paymentMethod || "").toLowerCase();

                            return (
                              <React.Fragment key={p._id}>
                                <tr className={`transition-colors ${isExpanded ? "bg-blue-50/30" : "hover:bg-gray-50"}`}>
                                  {/* # */}
                                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{globalIdx}</td>

                                  {/* Date */}
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-gray-800 whitespace-nowrap text-sm">{fmtDate(p.createdAt)}</p>
                                    <p className="text-xs text-gray-400">{fmtTime(p.createdAt)}</p>
                                  </td>

                                  {/* Invoice */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                      <Hash className="h-3 w-3 text-gray-400" />
                                      <span className="font-mono text-xs text-gray-700">{p.supplierInvoiceNo || <span className="text-gray-300 italic">—</span>}</span>
                                    </div>
                                  </td>

                                  {/* Items */}
                                  <td className="px-4 py-3">
                                    <p className="font-bold text-gray-800 text-sm">{totalQty > 0 ? `${totalQty} units` : `${p.products?.length ?? 0} SKUs`}</p>
                                    {p.products && p.products.length > 0 && (
                                      <p className="text-xs text-gray-400 max-w-[110px] truncate">
                                        {p.products.map(pr => pr.product?.name).filter(Boolean).join(", ")}
                                      </p>
                                    )}
                                  </td>

                                  {/* Financial columns */}
                                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">Rs {fmt(p.totalAmount)}</td>
                                  <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">Rs {fmt(p.amountPaid)}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`font-bold ${(p.balanceDue ?? 0) > 0 ? "text-red-600" : "text-gray-400"}`}>
                                      {(p.balanceDue ?? 0) > 0 ? `Rs ${fmt(p.balanceDue)}` : "—"}
                                    </span>
                                  </td>

                                  {/* Payment method */}
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${PAYMENT_PILLS[methodKey] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                      {PAYMENT_ICONS[methodKey]}
                                      <span className="capitalize">{p.paymentMethod}</span>
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                                      p.paymentStatus === "completed" ? "bg-green-100 text-green-700" :
                                      p.paymentStatus === "partial"   ? "bg-yellow-100 text-yellow-700" :
                                      "bg-red-100 text-red-700"
                                    }`}>
                                      {p.paymentStatus === "completed" ? <CheckCircle2 className="h-3 w-3" /> :
                                       p.paymentStatus === "partial"   ? <Clock className="h-3 w-3" /> :
                                       <AlertCircle className="h-3 w-3" />}
                                      {p.paymentStatus}
                                    </span>
                                  </td>

                                  {/* Expand button */}
                                  <td className="px-4 py-3 no-print">
                                    <button
                                      onClick={() => {
                                        const s = new Set(expandedRows);
                                        s.has(p._id) ? s.delete(p._id) : s.add(p._id);
                                        setExpandedRows(s);
                                      }}
                                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${isExpanded ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"}`}
                                    >
                                      {isExpanded ? <ChevronRight className="h-3.5 w-3.5 rotate-90" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                      {isExpanded ? "Hide" : "Details"}
                                    </button>
                                  </td>
                                </tr>

                                {/* ── Expanded product lines ── */}
                                {isExpanded && p.products && p.products.length > 0 && (
                                  <tr>
                                    <td colSpan={10} className="px-4 py-0 bg-blue-50/40">
                                      <div className="py-3 pl-8">
                                        <div className="rounded-xl border border-blue-200 overflow-hidden shadow-sm">
                                          {/* Expanded header */}
                                          <div className="bg-blue-100/80 px-4 py-2 flex items-center justify-between">
                                            <span className="text-xs font-black text-blue-800 uppercase tracking-wide">
                                              Order Details — {fmtDate(p.createdAt)}
                                            </span>
                                            {p.supplierInvoiceNo && (
                                              <span className="text-xs font-mono text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                INV #{p.supplierInvoiceNo}
                                              </span>
                                            )}
                                          </div>

                                          {/* Product lines */}
                                          <table className="w-full text-sm bg-white">
                                            <thead className="bg-blue-50 border-b border-blue-100">
                                              <tr>
                                                {["Product", "SKU", "Qty", "Base Rate", "Tax", "Freight", "Unit Cost", "Selling", "Profit/Unit", "Line Total"].map(h => (
                                                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-blue-700">{h}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-blue-50">
                                              {p.products.map((item, i) => {
                                                const profit = (item.sellingPrice || 0) - (item.unitCostWithTax || 0);
                                                const margin = item.unitCostWithTax > 0 ? (profit / item.unitCostWithTax) * 100 : 0;
                                                return (
                                                  <tr key={i} className="hover:bg-blue-50/30">
                                                    <td className="px-3 py-2.5 font-semibold text-gray-900">{item.product?.name}</td>
                                                    <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{item.product?.sku}</td>
                                                    <td className="px-3 py-2.5 font-black text-gray-900">{item.quantity}</td>
                                                    <td className="px-3 py-2.5 text-gray-700">Rs {fmt(item.buyingRate)}</td>
                                                    <td className="px-3 py-2.5 text-blue-600">
                                                      {item.taxType === "percentage" || item.taxType === "percent"
                                                        ? `${item.taxValue ?? 0}%`
                                                        : `Rs ${fmt(item.taxValue ?? 0)}`}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-purple-600">Rs {fmt(item.freightPerUnit ?? 0)}</td>
                                                    <td className="px-3 py-2.5 font-bold text-blue-700">Rs {fmt(item.unitCostWithTax)}</td>
                                                    <td className="px-3 py-2.5 font-bold text-green-700">Rs {fmt(item.sellingPrice)}</td>
                                                    <td className={`px-3 py-2.5 font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                      Rs {fmt(profit)}
                                                      <span className="text-xs font-normal ml-1 opacity-60">({margin.toFixed(1)}%)</span>
                                                    </td>
                                                    <td className="px-3 py-2.5 font-black text-gray-900">Rs {fmt(item.quantity * item.unitCostWithTax)}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                            <tfoot className="bg-slate-800 text-white text-xs">
                                              <tr>
                                                <td colSpan={2} className="px-3 py-2">
                                                  {p.notes && <span className="italic opacity-70">Note: {p.notes}</span>}
                                                </td>
                                                <td className="px-3 py-2 font-black">
                                                  {p.products.reduce((s, pr) => s + pr.quantity, 0)}
                                                </td>
                                                <td colSpan={5} />
                                                <td className="px-3 py-2 text-gray-300">Total Cost:</td>
                                                <td className="px-3 py-2 font-black text-white">Rs {fmt(p.totalAmount)}</td>
                                              </tr>
                                              <tr className="border-t border-slate-700">
                                                <td colSpan={5} className="px-3 py-2">
                                                  <span className="text-green-400">Paid: <span className="font-black">Rs {fmt(p.amountPaid)}</span></span>
                                                  {(p.balanceDue ?? 0) > 0 && (
                                                    <span className="ml-4 text-red-400">Balance Due: <span className="font-black">Rs {fmt(p.balanceDue)}</span></span>
                                                  )}
                                                </td>
                                                <td colSpan={5} className="px-3 py-2 text-right">
                                                  <span className="opacity-60">via {p.paymentMethod?.toUpperCase()}</span>
                                                  <span className={`ml-3 font-black ${p.paymentStatus === "completed" ? "text-green-400" : p.paymentStatus === "partial" ? "text-yellow-400" : "text-red-400"}`}>
                                                    {p.paymentStatus?.toUpperCase()}
                                                  </span>
                                                </td>
                                              </tr>
                                            </tfoot>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>

                        {/* Grand total footer */}
                        <tfoot className="bg-slate-900 text-white">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wide">
                              All-time Total ({purchases.length} orders)
                            </td>
                            <td className="px-4 py-3 font-black text-sm">{stats.totalItems.toLocaleString()} units</td>
                            <td className="px-4 py-3 font-black text-white">Rs {fmt(stats.totalBilled)}</td>
                            <td className="px-4 py-3 font-black text-green-400">Rs {fmt(stats.totalPaid)}</td>
                            <td className={`px-4 py-3 font-black ${stats.totalDue > 0 ? "text-red-400" : "text-slate-500"}`}>
                              {stats.totalDue > 0 ? `Rs ${fmt(stats.totalDue)}` : "—"}
                            </td>
                            <td colSpan={3} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                      currentPage={historyPage}
                      totalPages={totalHistoryPages}
                      onPageChange={setHistoryPage}
                      totalItems={purchases.length}
                      itemsPerPage={HISTORY_PER_PAGE}
                    />
                  </div>
                )}

                {/* ── Outstanding balance footer ── */}
                <div className={`rounded-xl p-5 flex items-center justify-between ${(selectedSupplier.balance ?? 0) > 0 ? "bg-red-600" : "bg-green-600"} text-white`}>
                  <div>
                    <p className="text-sm font-bold opacity-80">Current Outstanding Balance</p>
                    <p className="text-xs opacity-60 mt-0.5">{(selectedSupplier.balance ?? 0) > 0 ? "Amount we owe this supplier" : "Supplier is in credit"}</p>
                  </div>
                  <p className="text-3xl font-black">Rs {fmt(Math.abs(selectedSupplier.balance ?? 0))}</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}