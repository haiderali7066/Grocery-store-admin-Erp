"use client";

// FILE PATH: app/admin/inventory/page.tsx

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  AlertTriangle,
  Trash2,
  Package,
  Receipt,
  Wallet as WalletIcon,
  TrendingUp,
  Truck,
  Layers,
  Pencil,
  ShoppingBag,
  X,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RefreshCcw,
  PackageX,
  PackageCheck,
  ShoppingCart,
  BoxSelect,
  FileText,
  Hash,
  Building2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BatchInfo {
  _id: string;
  quantity: number;
  remainingQuantity: number;
  buyingRate: number;
  taxType: string;
  taxValue: number;
  freightPerUnit: number;
  unitCostWithTax: number;
  sellingPrice: number;
  profitPerUnit: number;
  status: string;
  isReturn?: boolean;
  createdAt: string;
}

interface InventoryItem {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  batches: BatchInfo[];
  currentBatch?: BatchInfo;
  lowStockThreshold: number;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Supplier {
  _id: string;
  name: string;
  balance: number;
}

interface PurchaseProduct {
  productId: string;
  quantity: string;
  buyingRate: string;
  taxType: "percentage" | "fixed";
  taxValue: string;
  freightPerUnit: string;
  sellingPrice: string;
  batchId?: string;
}

interface PurchaseRecordProduct {
  product: { _id: string; name: string; sku: string };
  quantity: number;
  buyingRate: number;
  unitCostWithTax: number;
  sellingPrice: number;
  taxType?: string;
  taxValue?: number;
  freightPerUnit?: number;
  batchNumber?: string;
}

interface PurchaseRecord {
  _id: string;
  supplierInvoiceNo?: string;
  supplier: { _id: string; name: string };
  products: PurchaseRecordProduct[];
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
}

interface WalletBalances {
  cash: number;
  bank: number;
  easyPaisa: number;
  jazzCash: number;
  totalBalance: number;
}

type PayMethod = "cash" | "bank" | "easypaisa" | "jazzcash" | "cheque";
type TabType = "inventory" | "purchases" | "reports";
type ReportPeriod = "today" | "weekly" | "monthly" | "custom";

const ITEMS_PER_PAGE = 10;
const REPORT_ITEMS_PER_PAGE = 50;

// ── Config ────────────────────────────────────────────────────────────────────

const PAY_CFG: Record<PayMethod, { label: string; walletKey: keyof WalletBalances | null; icon: React.ReactNode; pill: string }> = {
  cash:      { label: "Cash",          walletKey: "cash",      icon: <Banknote className="h-3.5 w-3.5" />,   pill: "text-green-700 bg-green-50 border-green-200" },
  bank:      { label: "Bank Transfer", walletKey: "bank",      icon: <CreditCard className="h-3.5 w-3.5" />, pill: "text-blue-700 bg-blue-50 border-blue-200" },
  easypaisa: { label: "EasyPaisa",     walletKey: "easyPaisa", icon: <Smartphone className="h-3.5 w-3.5" />, pill: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  jazzcash:  { label: "JazzCash",      walletKey: "jazzCash",  icon: <Smartphone className="h-3.5 w-3.5" />, pill: "text-orange-700 bg-orange-50 border-orange-200" },
  cheque:    { label: "Cheque",        walletKey: null,         icon: <CreditCard className="h-3.5 w-3.5" />, pill: "text-gray-700 bg-gray-50 border-gray-200" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt      = (n: number) => (n ?? 0).toFixed(2);
const fmtDate  = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateFull = (d: string) => new Date(d).toLocaleString("en-PK", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: true,
});

const emptyProductRow = (): PurchaseProduct => ({
  productId: "", quantity: "", buyingRate: "", taxType: "percentage",
  taxValue: "0", freightPerUnit: "0", sellingPrice: "",
});

// ── Pagination Component ──────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  label = "items",
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem   = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  // Build visible page numbers with ellipsis
  const getPageNumbers = () => {
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
    return pages;
  };

  return (
    <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between no-print flex-wrap gap-3">
      <div className="text-sm text-gray-500 font-medium">
        {startItem && endItem && totalItems ? (
          <>Showing <span className="font-bold text-gray-900">{startItem}–{endItem}</span> of <span className="font-bold text-gray-900">{totalItems}</span> {label}</>
        ) : (
          <>Page <span className="font-bold text-gray-900">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span></>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-[32px] ${
                page === currentPage
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold"
        >
          »
        </button>
      </div>
    </div>
  );
}

function WalletBadge({ method, wallet, paying }: { method: PayMethod; wallet: WalletBalances | null; paying?: number }) {
  if (!wallet) return null;
  const cfg = PAY_CFG[method];
  if (!cfg.walletKey) return <p className="text-xs text-gray-400 mt-1">No wallet tracking for cheques</p>;
  const bal = wallet[cfg.walletKey] as number;
  const insufficient = paying !== undefined && paying > 0 && paying > bal;
  return (
    <div className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold w-fit ${insufficient ? "bg-red-50 border-red-200 text-red-700" : cfg.pill}`}>
      {cfg.icon} Available: Rs {fmt(bal)}{insufficient && <span className="ml-1 font-bold">⚠ Low</span>}
    </div>
  );
}

// ── Inventory Summary Stats ───────────────────────────────────────────────────

function InventorySummary({ inventory }: { inventory: InventoryItem[] }) {
  const stats = inventory.reduce(
    (acc, item) => {
      const totalPurchased = item.batches?.filter(b => !b.isReturn).reduce((s, b) => s + b.quantity, 0) ?? 0;
      const currentStock = item.stock ?? 0;
      const totalSold = Math.max(totalPurchased - currentStock, 0);
      const isSoldOut = currentStock === 0;
      return {
        totalItems: acc.totalItems + 1,
        totalPurchased: acc.totalPurchased + totalPurchased,
        totalInStock: acc.totalInStock + currentStock,
        totalSold: acc.totalSold + totalSold,
        soldOutCount: acc.soldOutCount + (isSoldOut ? 1 : 0),
        lowStockCount: acc.lowStockCount + (currentStock > 0 && currentStock <= item.lowStockThreshold ? 1 : 0),
      };
    },
    { totalItems: 0, totalPurchased: 0, totalInStock: 0, totalSold: 0, soldOutCount: 0, lowStockCount: 0 }
  );

  const cards = [
    { label: "Total Products",   value: stats.totalItems,                 unit: "SKUs",            icon: <BoxSelect className="h-6 w-6" />,    color: "bg-slate-50 border-slate-200 text-slate-700",     iconColor: "text-slate-500 bg-slate-100" },
    { label: "Total Purchased",  value: stats.totalPurchased.toLocaleString(), unit: "units ever",  icon: <ShoppingCart className="h-6 w-6" />, color: "bg-blue-50 border-blue-200 text-blue-800",        iconColor: "text-blue-600 bg-blue-100" },
    { label: "In Stock",         value: stats.totalInStock.toLocaleString(),   unit: "units available", icon: <PackageCheck className="h-6 w-6" />, color: "bg-green-50 border-green-200 text-green-800", iconColor: "text-green-600 bg-green-100" },
    { label: "Total Sold",       value: stats.totalSold.toLocaleString(),      unit: "units sold",  icon: <TrendingUp className="h-6 w-6" />,   color: "bg-indigo-50 border-indigo-200 text-indigo-800",  iconColor: "text-indigo-600 bg-indigo-100" },
    { label: "Sold Out",         value: stats.soldOutCount,               unit: "products",        icon: <PackageX className="h-6 w-6" />,     color: stats.soldOutCount > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-gray-50 border-gray-200 text-gray-500", iconColor: stats.soldOutCount > 0 ? "text-red-600 bg-red-100" : "text-gray-400 bg-gray-100" },
    { label: "Low Stock",        value: stats.lowStockCount,              unit: "products",        icon: <AlertTriangle className="h-6 w-6" />, color: stats.lowStockCount > 0 ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-gray-50 border-gray-200 text-gray-500", iconColor: stats.lowStockCount > 0 ? "text-orange-600 bg-orange-100" : "text-gray-400 bg-gray-100" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {cards.map((c, i) => (
        <Card key={i} className={`p-4 border ${c.color} shadow-sm`}>
          <div className="flex items-start justify-between mb-2">
            <div className={`p-2 rounded-lg ${c.iconColor}`}>{c.icon}</div>
          </div>
          <p className="text-2xl font-black">{c.value}</p>
          <p className="text-xs font-semibold opacity-70 mt-0.5">{c.unit}</p>
          <p className="text-xs font-bold mt-1 opacity-60 uppercase tracking-wide">{c.label}</p>
        </Card>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab] = useState<TabType>("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [wallet, setWallet] = useState<WalletBalances | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedInventory, setExpandedInventory] = useState<Set<string>>(new Set());
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());
  const [expandedReportRows, setExpandedReportRows] = useState<Set<string>>(new Set());
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
  const [purchasesCurrentPage, setPurchasesCurrentPage] = useState(1);
  const [reportCurrentPage, setReportCurrentPage] = useState(1);

  // Edit
  const [editPurchase, setEditPurchase] = useState<PurchaseRecord | null>(null);
  const [editProducts, setEditProducts] = useState<PurchaseProduct[]>([]);
  const [editMeta, setEditMeta] = useState({ supplierId: "", paymentMethod: "cash" as PayMethod, supplierInvoiceNo: "", notes: "", amountPaid: "0" });
  const [isEditSaving, setIsEditSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New purchase
  const [purchaseProducts, setPurchaseProducts] = useState<PurchaseProduct[]>([emptyProductRow()]);
  const [purchaseData, setPurchaseData] = useState({ supplierId: "", paymentMethod: "cash" as PayMethod, supplierInvoiceNo: "", notes: "", amountPaid: "0" });

  // Reports
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("monthly");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchInventory(), fetchProducts(), fetchSuppliers(), fetchPurchases(), fetchWallet()]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function fetchInventory() {
    try { const r = await fetch("/api/admin/inventory"); const d = await r.json(); setInventory(d.inventory || []); } catch { setInventory([]); }
  }
  async function fetchProducts() {
    try { const r = await fetch("/api/admin/products"); const d = await r.json(); setProducts(d.products || []); } catch {}
  }
  async function fetchSuppliers() {
    try { const r = await fetch("/api/admin/suppliers"); const d = await r.json(); setSuppliers(d.suppliers || []); } catch {}
  }
  async function fetchPurchases() {
    try { const r = await fetch("/api/admin/purchases"); const d = await r.json(); setPurchases(d.purchases || []); } catch {}
  }
  async function fetchWallet() {
    try { const r = await fetch("/api/admin/wallet"); const d = await r.json(); setWallet(d.wallet || null); } catch {}
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  const inventoryTotalPages = Math.ceil(inventory.length / ITEMS_PER_PAGE);
  const paginatedInventory = useMemo(() => {
    const start = (inventoryCurrentPage - 1) * ITEMS_PER_PAGE;
    return inventory.slice(start, start + ITEMS_PER_PAGE);
  }, [inventory, inventoryCurrentPage]);

  const purchasesTotalPages = Math.ceil(purchases.length / ITEMS_PER_PAGE);
  const paginatedPurchases = useMemo(() => {
    const start = (purchasesCurrentPage - 1) * ITEMS_PER_PAGE;
    return purchases.slice(start, start + ITEMS_PER_PAGE);
  }, [purchases, purchasesCurrentPage]);

  // ── Product row helpers ───────────────────────────────────────────────────

  const calcUnitCost = (item: PurchaseProduct) => {
    const base = parseFloat(item.buyingRate) || 0;
    const tax = parseFloat(item.taxValue) || 0;
    const freight = parseFloat(item.freightPerUnit) || 0;
    return (item.taxType === "percentage" ? base + base * (tax / 100) : base + tax) + freight;
  };
  const calcSubtotal = (item: PurchaseProduct) => (parseFloat(item.quantity) || 0) * calcUnitCost(item);
  const calcProfit = (item: PurchaseProduct) => {
    const unitCost = calcUnitCost(item);
    const selling = parseFloat(item.sellingPrice) || 0;
    const qty = parseFloat(item.quantity) || 0;
    const profitPerUnit = selling - unitCost;
    return { profitPerUnit, totalProfit: profitPerUnit * qty, margin: unitCost > 0 ? (profitPerUnit / unitCost) * 100 : 0 };
  };

  const totalBill = purchaseProducts.reduce((t, i) => t + calcSubtotal(i), 0);
  const amountPaidNum = parseFloat(purchaseData.amountPaid) || 0;
  const balanceDue = totalBill - amountPaidNum;

  const editTotalBill = editProducts.reduce((t, i) => t + calcSubtotal(i), 0);
  const editAmountPaid = parseFloat(editMeta.amountPaid) || 0;
  const editBalanceDue = editTotalBill - editAmountPaid;

  const newMethodCfg = PAY_CFG[purchaseData.paymentMethod];
  const newWalletBal = wallet && newMethodCfg.walletKey ? (wallet[newMethodCfg.walletKey] as number) : null;
  const insufficientNew = newWalletBal !== null && amountPaidNum > newWalletBal;

  // ── New purchase ──────────────────────────────────────────────────────────

  const handleBulkPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseData.supplierId) { alert("Select a supplier"); return; }
    const valid = purchaseProducts.filter(p => p.productId && p.quantity && p.buyingRate && p.sellingPrice);
    if (!valid.length) { alert("Add at least one valid product"); return; }
    if (insufficientNew && !window.confirm(`Wallet balance low (Rs ${fmt(newWalletBal!)}). Continue?`)) return;

    try {
      const res = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: purchaseData.supplierId,
          products: valid.map(p => ({
            product: p.productId, quantity: parseInt(p.quantity), buyingRate: parseFloat(p.buyingRate),
            taxType: p.taxType, taxValue: parseFloat(p.taxValue), freightPerUnit: parseFloat(p.freightPerUnit),
            unitCostWithTax: calcUnitCost(p), sellingPrice: parseFloat(p.sellingPrice),
          })),
          paymentMethod: purchaseData.paymentMethod, supplierInvoiceNo: purchaseData.supplierInvoiceNo,
          notes: purchaseData.notes, totalAmount: totalBill, amountPaid: amountPaidNum, balanceDue,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Purchase created!\nTotal: Rs ${fmt(totalBill)}\nPaid: Rs ${fmt(amountPaidNum)}\nBalance Due: Rs ${fmt(balanceDue)}`);
        setIsAddDialogOpen(false);
        setPurchaseProducts([emptyProductRow()]);
        setPurchaseData({ supplierId: "", paymentMethod: "cash", supplierInvoiceNo: "", notes: "", amountPaid: "0" });
        fetchAll();
      } else { alert(`Failed: ${data.error || "Unknown error"}`); }
    } catch { alert("Error creating purchase"); }
  };

  // ── Edit purchase ─────────────────────────────────────────────────────────

  const openEdit = (p: PurchaseRecord) => {
    setEditPurchase(p);
    setEditMeta({
      supplierId: p.supplier._id,
      paymentMethod: (p.paymentMethod as PayMethod) || "cash",
      supplierInvoiceNo: p.supplierInvoiceNo || "",
      notes: p.notes || "",
      amountPaid: String(p.amountPaid),
    });
    setEditProducts(p.products.map(item => ({
      productId: item.product._id,
      quantity: String(item.quantity),
      buyingRate: String(item.buyingRate),
      taxType: (item.taxType === "percent" ? "percentage" : item.taxType || "percentage") as "percentage" | "fixed",
      taxValue: String(item.taxValue ?? 0),
      freightPerUnit: String(item.freightPerUnit ?? 0),
      sellingPrice: String(item.sellingPrice),
      batchId: item.batchNumber,
    })));
  };

  const handleEditSave = async () => {
    if (!editPurchase) return;
    if (!editMeta.supplierId) { alert("Select a supplier"); return; }
    const valid = editProducts.filter(p => p.productId && p.quantity && p.buyingRate && p.sellingPrice);
    if (!valid.length) { alert("Add at least one valid product"); return; }

    setIsEditSaving(true);
    try {
      const res = await fetch(`/api/admin/purchases/${editPurchase._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: editMeta.supplierId,
          paymentMethod: editMeta.paymentMethod,
          supplierInvoiceNo: editMeta.supplierInvoiceNo,
          notes: editMeta.notes,
          amountPaid: editAmountPaid,
          balanceDue: editBalanceDue,
          totalAmount: editTotalBill,
          products: valid.map(p => ({
            product: p.productId, batchId: p.batchId,
            quantity: parseInt(p.quantity), buyingRate: parseFloat(p.buyingRate),
            taxType: p.taxType, taxValue: parseFloat(p.taxValue),
            freightPerUnit: parseFloat(p.freightPerUnit),
            unitCostWithTax: calcUnitCost(p), sellingPrice: parseFloat(p.sellingPrice),
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) { setEditPurchase(null); fetchAll(); alert("Purchase updated successfully!"); }
      else { alert(data.message || "Failed to update"); }
    } catch { alert("Error updating purchase"); }
    finally { setIsEditSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/purchases/${deletingId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { setDeletingId(null); fetchAll(); }
      else { alert(data.message || "Failed to delete"); }
    } catch { alert("Error deleting purchase"); }
    finally { setIsDeleting(false); }
  };

  // ── Report filtering ──────────────────────────────────────────────────────

  const getReportPurchases = useCallback(() => {
    const now = new Date();
    return purchases.filter(p => {
      const d = new Date(p.createdAt);
      if (reportPeriod === "today") { const s = new Date(now); s.setHours(0,0,0,0); return d >= s; }
      if (reportPeriod === "weekly") { const s = new Date(now); s.setDate(s.getDate()-7); return d >= s; }
      if (reportPeriod === "monthly") { const s = new Date(now.getFullYear(), now.getMonth(), 1); return d >= s; }
      if (reportPeriod === "custom" && reportFrom && reportTo) {
        const s = new Date(reportFrom); s.setHours(0,0,0,0);
        const e = new Date(reportTo); e.setHours(23,59,59,999);
        return d >= s && d <= e;
      }
      return true;
    });
  }, [purchases, reportPeriod, reportFrom, reportTo]);

  const reportPurchases = useMemo(() => getReportPurchases(), [getReportPurchases]);

  // Reset page when filter changes
  useEffect(() => { setReportCurrentPage(1); }, [reportPeriod, reportFrom, reportTo]);

  const reportTotals = useMemo(() => reportPurchases.reduce((acc, p) => ({
    total: acc.total + p.totalAmount,
    paid: acc.paid + p.amountPaid,
    due: acc.due + p.balanceDue,
    items: acc.items + p.products.reduce((s, pr) => s + pr.quantity, 0),
    orders: acc.orders + 1,
  }), { total: 0, paid: 0, due: 0, items: 0, orders: 0 }), [reportPurchases]);

  // Paginate report
  const reportTotalPages = Math.ceil(reportPurchases.length / REPORT_ITEMS_PER_PAGE);
  const paginatedReport = useMemo(() => {
    const start = (reportCurrentPage - 1) * REPORT_ITEMS_PER_PAGE;
    return reportPurchases.slice(start, start + REPORT_ITEMS_PER_PAGE);
  }, [reportPurchases, reportCurrentPage]);

  // Supplier summary for report
  const supplierSummary = useMemo(() => {
    const bySup: Record<string, { name: string; orders: number; total: number; paid: number; due: number; items: number }> = {};
    reportPurchases.forEach(p => {
      const id = p.supplier._id;
      if (!bySup[id]) bySup[id] = { name: p.supplier.name, orders: 0, total: 0, paid: 0, due: 0, items: 0 };
      bySup[id].orders++;
      bySup[id].total += p.totalAmount;
      bySup[id].paid += p.amountPaid;
      bySup[id].due += p.balanceDue;
      bySup[id].items += p.products.reduce((s, pr) => s + pr.quantity, 0);
    });
    return Object.values(bySup).sort((a, b) => b.total - a.total);
  }, [reportPurchases]);

  const periodLabel = reportPeriod === "custom" && reportFrom && reportTo
    ? `${reportFrom} → ${reportTo}`
    : { today: "Today", weekly: "Last 7 Days", monthly: "This Month", custom: "Custom" }[reportPeriod];

  const lowStockItems = inventory.filter(i => i && i.stock <= i.lowStockThreshold);

  // ── Product row renderer ──────────────────────────────────────────────────

  const renderProductRows = (
    rows: PurchaseProduct[],
    setRows: React.Dispatch<React.SetStateAction<PurchaseProduct[]>>,
    isEdit = false
  ) => {
    const update = (i: number, field: keyof PurchaseProduct, val: string) => {
      const u = [...rows]; u[i] = { ...u[i], [field]: val }; setRows(u);
    };
    const remove = (i: number) => { if (rows.length > 1) setRows(rows.filter((_, idx) => idx !== i)); };
    const add = () => setRows([...rows, emptyProductRow()]);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" /> Purchase Items
          </h3>
          <Button type="button" onClick={add} variant="outline" size="sm" className="text-green-600 border-green-600">
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </div>
        {rows.map((item, index) => {
          const { profitPerUnit, totalProfit, margin } = calcProfit(item);
          const unitCost = calcUnitCost(item);
          const baseRate = parseFloat(item.buyingRate) || 0;
          const taxVal = parseFloat(item.taxValue) || 0;
          const freight = parseFloat(item.freightPerUnit) || 0;
          const taxAmount = item.taxType === "percentage" ? baseRate * (taxVal / 100) : taxVal;

          return (
            <Card key={index} className="p-4 border-l-4 border-l-blue-500 shadow-sm">
              <div className="grid grid-cols-12 gap-3 items-end mb-3">
                <div className="col-span-12 md:col-span-3">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Product *</label>
                  <select value={item.productId} onChange={e => update(index, "productId", e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md text-sm bg-white" required>
                    <option value="">Select...</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div className="col-span-3 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Qty *</label>
                  <Input type="number" value={item.quantity} onChange={e => update(index, "quantity", e.target.value)} className="mt-1" min="1" required />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Base Rate (Rs) *</label>
                  <Input type="number" step="0.01" value={item.buyingRate} onChange={e => update(index, "buyingRate", e.target.value)} className="mt-1" min="0" required />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Tax Type & Value</label>
                  <div className="flex mt-1">
                    <select value={item.taxType} onChange={e => update(index, "taxType", e.target.value)}
                      className="p-2 border rounded-l-md bg-slate-50 text-xs font-bold border-r-0">
                      <option value="percentage">%</option>
                      <option value="fixed">Rs</option>
                    </select>
                    <Input type="number" step="0.01" value={item.taxValue} onChange={e => update(index, "taxValue", e.target.value)} className="rounded-l-none" min="0" />
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <Truck className="h-3 w-3" />Freight/Unit (Rs)
                  </label>
                  <Input type="number" step="0.01" value={item.freightPerUnit} onChange={e => update(index, "freightPerUnit", e.target.value)} className="mt-1" min="0" />
                </div>
                <div className="col-span-12 md:col-span-1">
                  {rows.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-400 w-full hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>

              {item.buyingRate && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div><span className="text-gray-500">Base</span><p className="font-bold text-gray-900">Rs {baseRate.toFixed(2)}</p></div>
                    <div><span className="text-gray-500">+ Tax</span><p className="font-bold text-blue-600">Rs {taxAmount.toFixed(2)}</p></div>
                    <div><span className="text-gray-500">+ Freight</span><p className="font-bold text-purple-600">Rs {freight.toFixed(2)}</p></div>
                    <div><span className="text-gray-500">= Unit Cost</span><p className="font-bold text-lg text-blue-700">Rs {unitCost.toFixed(2)}</p></div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Selling Price *</label>
                      <Input type="number" step="0.01" value={item.sellingPrice} onChange={e => update(index, "sellingPrice", e.target.value)} required className="h-8" min="0" />
                    </div>
                  </div>
                </div>
              )}

              {item.quantity && item.buyingRate && item.sellingPrice && (
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-600">Total Cost:</span><p className="font-bold">Rs {calcSubtotal(item).toFixed(2)}</p></div>
                    <div><span className="text-gray-600">Revenue:</span><p className="font-bold">Rs {(parseFloat(item.quantity) * parseFloat(item.sellingPrice)).toFixed(2)}</p></div>
                    <div><span className="text-gray-600">Total Profit:</span><p className={`font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs {totalProfit.toFixed(2)}</p></div>
                    <div><span className="text-gray-600">Margin:</span><p className={`font-bold ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>{margin.toFixed(1)}% (Rs {profitPerUnit.toFixed(2)}/unit)</p></div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #inv-print-area, #inv-print-area * { visibility: visible; }
          #inv-print-area { position: absolute; inset: 0; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 no-print">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inventory & Purchases</h1>
              <p className="text-gray-500 text-sm">Track stock, FIFO batches and purchase history</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={fetchAll} className="gap-2 rounded-xl">
                <RefreshCcw className="h-4 w-4" /> Refresh
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg px-6">
                    <Plus className="h-5 w-5 mr-2" /> New Purchase Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                      <Receipt className="h-6 w-6 text-blue-600" /> Create Purchase Order
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBulkPurchase} className="space-y-6 mt-4">
                    <Card className="p-4 bg-slate-50 border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-semibold mb-1 block">Supplier *</label>
                          <select value={purchaseData.supplierId} onChange={e => setPurchaseData({ ...purchaseData, supplierId: e.target.value })}
                            className="w-full p-2 border rounded-md bg-white" required>
                            <option value="">Choose Supplier</option>
                            {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}{s.balance > 0 ? ` (Owe: Rs ${s.balance.toFixed(2)})` : ""}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-semibold mb-1 block">Invoice #</label>
                          <Input value={purchaseData.supplierInvoiceNo} onChange={e => setPurchaseData({ ...purchaseData, supplierInvoiceNo: e.target.value })} placeholder="INV-99" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold mb-1 block">Payment Method</label>
                          <select value={purchaseData.paymentMethod} onChange={e => setPurchaseData({ ...purchaseData, paymentMethod: e.target.value as PayMethod })}
                            className="w-full p-2 border rounded-md bg-white">
                            {(Object.entries(PAY_CFG) as [PayMethod, typeof PAY_CFG[PayMethod]][]).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                          </select>
                          <WalletBadge method={purchaseData.paymentMethod} wallet={wallet} paying={amountPaidNum} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="text-sm font-semibold mb-1 block">Notes (Optional)</label>
                        <Input value={purchaseData.notes} onChange={e => setPurchaseData({ ...purchaseData, notes: e.target.value })} placeholder="Add any additional notes..." />
                      </div>
                    </Card>

                    {renderProductRows(purchaseProducts, setPurchaseProducts)}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                      <Card className="p-4 border-orange-200 bg-orange-50/50">
                        <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-3"><WalletIcon className="h-4 w-4" /> Payment</h4>
                        <label className="text-sm font-semibold block mb-1">Amount Paid Now</label>
                        <Input type="number" step="0.01" value={purchaseData.amountPaid}
                          onChange={e => setPurchaseData({ ...purchaseData, amountPaid: e.target.value })}
                          className={`text-lg font-bold bg-white ${insufficientNew ? "border-red-400" : "border-orange-300"}`} min="0" />
                        {newWalletBal !== null && amountPaidNum > 0 && (
                          <div className={`mt-3 p-3 rounded-xl border text-sm space-y-1 ${insufficientNew ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                            <div className="flex justify-between"><span className="text-gray-600">{newMethodCfg.label} balance:</span><span className="font-bold">Rs {fmt(newWalletBal)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">After payment:</span>
                              <span className={`font-black ${newWalletBal - amountPaidNum < 0 ? "text-red-600" : "text-green-700"}`}>Rs {fmt(newWalletBal - amountPaidNum)}</span>
                            </div>
                          </div>
                        )}
                      </Card>
                      <Card className="p-6 bg-slate-900 text-white flex flex-col justify-center space-y-3 shadow-xl">
                        <div className="flex justify-between items-center"><span className="text-lg font-bold">Total Bill:</span><span className="text-2xl font-bold">Rs {fmt(totalBill)}</span></div>
                        <div className="flex justify-between items-center opacity-80 text-sm border-t border-slate-700 pt-2"><span>Amount Paid:</span><span className="text-green-400">(-) Rs {fmt(amountPaidNum)}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                          <span className="text-lg font-bold">Balance Due:</span>
                          <span className={`text-3xl font-black ${balanceDue > 0 ? "text-red-400" : "text-green-400"}`}>Rs {fmt(Math.abs(balanceDue))}</span>
                        </div>
                      </Card>
                    </div>
                    <Button type="submit" className="w-full py-6 text-xl bg-green-600 hover:bg-green-700 font-bold shadow-xl">
                      Finalize Purchase & Update Supplier Balance
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Wallet chips */}
          {wallet && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 font-semibold self-center mr-1">Wallet:</span>
              {(Object.entries(PAY_CFG) as [PayMethod, typeof PAY_CFG[PayMethod]][]).filter(([, c]) => c.walletKey !== null).map(([key, c]) => {
                const bal = wallet[c.walletKey as keyof WalletBalances] as number;
                return (
                  <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${c.pill}`}>
                    {c.icon} {c.label}: Rs {fmt(bal)}
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold text-slate-700 bg-slate-50 border-slate-200">
                <WalletIcon className="h-3.5 w-3.5" /> Total: Rs {fmt(wallet.totalBalance)}
              </div>
            </div>
          )}
        </div>

        {/* Low stock alert */}
        {lowStockItems.length > 0 && (
          <Card className="p-4 bg-orange-50 border-2 border-orange-300 shadow-md no-print">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <div>
                <p className="font-bold text-orange-900 text-lg">Low Stock Alert</p>
                <p className="text-sm text-orange-700">{lowStockItems.length} products need restocking: {lowStockItems.map(i => i.name).join(", ")}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit no-print">
          {(["inventory", "purchases", "reports"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "inventory" && <span className="flex items-center gap-1.5"><Package className="h-4 w-4" />Inventory</span>}
              {t === "purchases" && <span className="flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" />Purchases</span>}
              {t === "reports"   && <span className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4" />Reports</span>}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════ INVENTORY TAB */}
        {tab === "inventory" && (
          <div className="space-y-4">
            {!isLoading && inventory.length > 0 && <InventorySummary inventory={inventory} />}
            <Card className="shadow-xl overflow-hidden border-0">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto" />
                    <p className="mt-4 text-gray-600">Loading inventory...</p>
                  </div>
                ) : paginatedInventory.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b-2">
                      <tr>
                        {["Product", "SKU", "Purchased", "Sold", "In Stock", "Selling Price", "Profit/Unit", "Status", "Batches"].map(h => (
                          <th key={h} className="px-6 py-4 font-bold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedInventory.map(item => {
                        const totalPurchased = item.batches?.filter(b => !b.isReturn).reduce((s, b) => s + b.quantity, 0) ?? 0;
                        const currentStock = item.stock ?? 0;
                        const totalSold = Math.max(totalPurchased - currentStock, 0);
                        const isSoldOut = currentStock === 0;
                        const isLow = !isSoldOut && currentStock <= item.lowStockThreshold;

                        return (
                          <React.Fragment key={item._id}>
                            <tr className={`transition-colors ${isSoldOut ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-slate-50"}`}>
                              <td className="px-6 py-4 font-semibold text-gray-900">{item.name}</td>
                              <td className="px-6 py-4 text-gray-500 font-mono text-sm">{item.sku}</td>
                              <td className="px-6 py-4">
                                <span className="text-lg font-bold text-blue-700">{totalPurchased}</span>
                                <span className="text-xs text-gray-400 ml-1">units</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-lg font-bold ${totalSold > 0 ? "text-indigo-600" : "text-gray-300"}`}>{totalSold}</span>
                                <span className="text-xs text-gray-400 ml-1">units</span>
                                {totalPurchased > 0 && (
                                  <div className="mt-1 w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((totalSold / totalPurchased) * 100, 100)}%` }} />
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-lg font-bold ${isSoldOut ? "text-red-600" : isLow ? "text-orange-600" : "text-green-600"}`}>{currentStock}</span>
                                <span className="text-xs text-gray-400 ml-1">units</span>
                              </td>
                              <td className="px-6 py-4">
                                {item.currentBatch ? <span className="text-lg font-bold text-green-600">Rs {item.currentBatch.sellingPrice.toFixed(2)}</span> : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-6 py-4">
                                {item.currentBatch ? (
                                  <div>
                                    <span className={`text-lg font-bold ${item.currentBatch.profitPerUnit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs {item.currentBatch.profitPerUnit.toFixed(2)}</span>
                                    <p className="text-xs text-gray-500">{((item.currentBatch.profitPerUnit / item.currentBatch.unitCostWithTax) * 100).toFixed(1)}% margin</p>
                                  </div>
                                ) : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-6 py-4">
                                {isSoldOut ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700 flex items-center gap-1 w-fit"><PackageX className="h-3 w-3" /> Sold Out</span>
                                ) : isLow ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-orange-100 text-orange-700 flex items-center gap-1 w-fit"><AlertTriangle className="h-3 w-3" /> Low</span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700 flex items-center gap-1 w-fit"><PackageCheck className="h-3 w-3" /> In Stock</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <Button variant="outline" size="sm"
                                  onClick={() => { const s = new Set(expandedInventory); s.has(item._id) ? s.delete(item._id) : s.add(item._id); setExpandedInventory(s); }}
                                  className="text-blue-600 hover:bg-blue-50">
                                  <Layers className="h-4 w-4 mr-1" />
                                  {expandedInventory.has(item._id) ? "Hide" : "View"} ({item.batches?.length || 0})
                                </Button>
                              </td>
                            </tr>
                            {expandedInventory.has(item._id) && (
                              <tr>
                                <td colSpan={9} className="px-6 py-4 bg-gray-50">
                                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4" />FIFO Batch History</h4>
                                  {item.batches?.length > 0 ? (
                                    <div className="grid gap-2">
                                      {item.batches.map((batch, idx) => {
                                        const soldFromBatch = batch.quantity - (batch.remainingQuantity ?? 0);
                                        const soldPct = batch.quantity > 0 ? (soldFromBatch / batch.quantity) * 100 : 0;
                                        return (
                                          <div key={batch._id} className={`p-3 rounded-lg border-2 ${batch.status === "active" ? "bg-green-50 border-green-300" : batch.status === "partial" ? "bg-yellow-50 border-yellow-300" : "bg-gray-100 border-gray-300"}`}>
                                            <div className="grid grid-cols-9 gap-3 text-sm">
                                              <div><span className="text-gray-600 text-xs">Batch #{idx + 1}</span><p className="font-semibold">{batch.quantity} purchased</p></div>
                                              <div><span className="text-gray-600 text-xs">Sold</span><p className="font-bold text-indigo-600">{soldFromBatch}</p></div>
                                              <div>
                                                <span className="text-gray-600 text-xs">Remaining</span>
                                                <p className={`font-bold ${(batch.remainingQuantity ?? 0) === 0 ? "text-red-600" : "text-green-600"}`}>{batch.remainingQuantity ?? 0}</p>
                                                <div className="mt-1 w-12 h-1 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-400 rounded-full" style={{ width: `${soldPct}%` }} /></div>
                                              </div>
                                              <div><span className="text-gray-600 text-xs">Base Rate</span><p className="font-semibold">Rs {batch.buyingRate.toFixed(2)}</p></div>
                                              <div><span className="text-gray-600 text-xs">Tax</span><p className="font-semibold">{batch.taxType === "percentage" || batch.taxType === "percent" ? `${batch.taxValue}%` : `Rs ${batch.taxValue}`}</p></div>
                                              <div><span className="text-gray-600 text-xs">Freight</span><p className="font-semibold text-purple-600">Rs {batch.freightPerUnit.toFixed(2)}</p></div>
                                              <div><span className="text-gray-600 text-xs">Unit Cost</span><p className="font-semibold text-blue-600">Rs {batch.unitCostWithTax.toFixed(2)}</p></div>
                                              <div><span className="text-gray-600 text-xs">Selling</span><p className="font-semibold text-green-600">Rs {batch.sellingPrice.toFixed(2)}</p></div>
                                              <div>
                                                <span className="text-gray-600 text-xs">Status</span>
                                                <p className={`font-semibold capitalize text-xs mt-0.5 px-2 py-0.5 rounded-full w-fit ${batch.status === "active" ? "bg-green-200 text-green-800" : batch.status === "partial" ? "bg-yellow-200 text-yellow-800" : "bg-gray-200 text-gray-700"}`}>{batch.status}</p>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : <p className="text-gray-500 text-sm">No batches</p>}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No inventory items</p>
                    <p className="text-gray-400 text-sm mt-2">Create a purchase order to add stock</p>
                  </div>
                )}
              </div>
              <Pagination currentPage={inventoryCurrentPage} totalPages={inventoryTotalPages} onPageChange={setInventoryCurrentPage} totalItems={inventory.length} itemsPerPage={ITEMS_PER_PAGE} label="products" />
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ PURCHASES TAB */}
        {tab === "purchases" && (
          <Card className="shadow-xl overflow-hidden border-0">
            <div className="overflow-x-auto">
              {paginatedPurchases.length > 0 ? (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b-2">
                    <tr>
                      {["Date", "Invoice", "Supplier", "Items", "Total", "Paid", "Balance", "Method", "Status", "Actions"].map(h => (
                        <th key={h} className="px-5 py-4 font-bold text-gray-600 text-sm">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedPurchases.map(p => {
                      const mCfg = PAY_CFG[p.paymentMethod as PayMethod];
                      const isExpanded = expandedPurchases.has(p._id);
                      return (
                        <React.Fragment key={p._id}>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                            <td className="px-5 py-4 text-sm font-mono text-gray-700">{p.supplierInvoiceNo || "—"}</td>
                            <td className="px-5 py-4 font-semibold text-gray-900">{p.supplier?.name}</td>
                            <td className="px-5 py-4">
                              <button onClick={() => { const s = new Set(expandedPurchases); s.has(p._id) ? s.delete(p._id) : s.add(p._id); setExpandedPurchases(s); }}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                {p.products?.length} item{p.products?.length !== 1 ? "s" : ""}
                              </button>
                            </td>
                            <td className="px-5 py-4 font-bold text-gray-900">Rs {fmt(p.totalAmount)}</td>
                            <td className="px-5 py-4 text-green-600 font-semibold">Rs {fmt(p.amountPaid)}</td>
                            <td className="px-5 py-4"><span className={`font-bold ${p.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>Rs {fmt(p.balanceDue)}</span></td>
                            <td className="px-5 py-4">{mCfg ? <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${mCfg.pill}`}>{mCfg.icon}{mCfg.label}</span> : <span className="text-gray-500 text-sm">{p.paymentMethod}</span>}</td>
                            <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${p.paymentStatus === "completed" ? "bg-green-100 text-green-700" : p.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{p.paymentStatus}</span></td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="gap-1.5 text-blue-600 hover:bg-blue-50 border-blue-200"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                                <Button size="sm" variant="outline" onClick={() => setDeletingId(p._id)} className="gap-1.5 text-red-500 hover:bg-red-50 border-red-200"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="px-5 py-3 bg-blue-50/50">
                                <div className="rounded-xl overflow-hidden border border-blue-100">
                                  <table className="w-full text-sm">
                                    <thead className="bg-blue-100/60">
                                      <tr>{["Product", "SKU", "Qty", "Base Rate", "Tax", "Freight", "Unit Cost", "Selling", "Profit/Unit", "Subtotal"].map(h => (<th key={h} className="px-4 py-2 text-left text-xs font-bold text-blue-800">{h}</th>))}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-100">
                                      {p.products.map((item, idx) => {
                                        const profit = item.sellingPrice - item.unitCostWithTax;
                                        return (
                                          <tr key={idx} className="hover:bg-blue-50/50">
                                            <td className="px-4 py-2 font-medium text-gray-800">{item.product?.name}</td>
                                            <td className="px-4 py-2 text-gray-500 font-mono text-xs">{item.product?.sku}</td>
                                            <td className="px-4 py-2 font-bold">{item.quantity}</td>
                                            <td className="px-4 py-2">Rs {fmt(item.buyingRate)}</td>
                                            <td className="px-4 py-2 text-blue-600">{item.taxType === "percent" || item.taxType === "percentage" ? `${item.taxValue ?? 0}%` : `Rs ${item.taxValue ?? 0}`}</td>
                                            <td className="px-4 py-2 text-purple-600">Rs {fmt(item.freightPerUnit ?? 0)}</td>
                                            <td className="px-4 py-2 font-bold text-blue-700">Rs {fmt(item.unitCostWithTax)}</td>
                                            <td className="px-4 py-2 font-bold text-green-600">Rs {fmt(item.sellingPrice)}</td>
                                            <td className={`px-4 py-2 font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs {fmt(profit)}</td>
                                            <td className="px-4 py-2 font-black text-gray-900">Rs {fmt(item.quantity * item.unitCostWithTax)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot className="bg-blue-100/40">
                                      <tr><td colSpan={9} className="px-4 py-2 font-bold text-right text-gray-700">Total:</td><td className="px-4 py-2 font-black text-gray-900">Rs {fmt(p.totalAmount)}</td></tr>
                                    </tfoot>
                                  </table>
                                </div>
                                {p.notes && <p className="mt-2 text-xs text-gray-500 italic px-1">Note: {p.notes}</p>}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12"><ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-lg">No purchases yet</p></div>
              )}
            </div>
            <Pagination currentPage={purchasesCurrentPage} totalPages={purchasesTotalPages} onPageChange={setPurchasesCurrentPage} totalItems={purchases.length} itemsPerPage={ITEMS_PER_PAGE} label="purchases" />
          </Card>
        )}

        {/* ════════════════════════════════════════════════════════ REPORTS TAB */}
        {tab === "reports" && (
          <div className="space-y-5">

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                  {(["today", "weekly", "monthly", "custom"] as ReportPeriod[]).map(p => (
                    <button key={p} onClick={() => { setReportPeriod(p); setShowCustomDate(p === "custom"); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${reportPeriod === p ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
                      {p === "custom" ? <><Calendar className="h-3 w-3 inline mr-1" />Custom</> : p}
                    </button>
                  ))}
                </div>
                {showCustomDate && (
                  <div className="flex items-end gap-2">
                    <div><label className="text-xs font-bold text-gray-500 block mb-1">FROM</label>
                      <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" /></div>
                    <div><label className="text-xs font-bold text-gray-500 block mb-1">TO</label>
                      <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" /></div>
                  </div>
                )}
              </div>
              <Button onClick={() => window.print()} variant="outline" className="gap-2 rounded-xl border-gray-300 no-print">
                <Printer className="h-4 w-4" /> Print Report
              </Button>
            </div>

            <div id="inv-print-area">
              {/* Print header */}
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-black text-gray-900">Purchase Report</h1>
                <p className="text-gray-500 text-sm">Period: {periodLabel}</p>
                <p className="text-gray-400 text-xs">Generated: {new Date().toLocaleString()}</p>
                <hr className="mt-3 border-gray-200" />
              </div>

              {/* ── Summary KPI cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                  { label: "Orders",         value: reportTotals.orders,               suffix: "",      color: "bg-slate-50 border-slate-200 text-slate-700",   icon: <FileText className="h-5 w-5" /> },
                  { label: "Total Purchased", value: `Rs ${fmt(reportTotals.total)}`,   suffix: "",      color: "bg-blue-50 border-blue-200 text-blue-800",      icon: <ShoppingBag className="h-5 w-5" /> },
                  { label: "Amount Paid",     value: `Rs ${fmt(reportTotals.paid)}`,    suffix: "",      color: "bg-green-50 border-green-200 text-green-800",   icon: <Banknote className="h-5 w-5" /> },
                  { label: "Balance Due",     value: `Rs ${fmt(reportTotals.due)}`,     suffix: "",      color: reportTotals.due > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-gray-50 border-gray-200 text-gray-500", icon: <AlertCircle className="h-5 w-5" /> },
                  { label: "Items Purchased", value: reportTotals.items.toLocaleString(), suffix: "units", color: "bg-indigo-50 border-indigo-200 text-indigo-800", icon: <Package className="h-5 w-5" /> },
                ].map((s, i) => (
                  <Card key={i} className={`p-4 border shadow-sm ${s.color}`}>
                    <div className="flex items-center gap-2 mb-2 opacity-70">{s.icon}<span className="text-xs font-bold uppercase tracking-wide">{s.label}</span></div>
                    <p className="text-xl font-black">{s.value}</p>
                    {s.suffix && <p className="text-xs opacity-60 mt-0.5">{s.suffix}</p>}
                  </Card>
                ))}
              </div>

              {/* ── Supplier Summary ── */}
              {supplierSummary.length > 0 && (
                <Card className="border-0 shadow-md overflow-hidden mb-6">
                  <div className="bg-gray-900 text-white px-5 py-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <h3 className="font-black">By Supplier — {periodLabel}</h3>
                    <span className="ml-auto text-xs opacity-60">{supplierSummary.length} suppliers</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {["Supplier", "Orders", "Items", "Total Amount", "Amount Paid", "Balance Due", "Status"].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {supplierSummary.map((s, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-5 py-3 font-semibold text-gray-800">{s.name}</td>
                            <td className="px-5 py-3 text-gray-600">{s.orders}</td>
                            <td className="px-5 py-3 text-gray-600">{s.items.toLocaleString()}</td>
                            <td className="px-5 py-3 font-bold text-gray-900">Rs {fmt(s.total)}</td>
                            <td className="px-5 py-3 text-green-700 font-bold">Rs {fmt(s.paid)}</td>
                            <td className={`px-5 py-3 font-bold ${s.due > 0 ? "text-red-600" : "text-gray-400"}`}>Rs {fmt(s.due)}</td>
                            <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${s.due <= 0 ? "bg-green-100 text-green-700" : s.paid > 0 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{s.due <= 0 ? "Cleared" : s.paid > 0 ? "Partial" : "Pending"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 font-black">
                        <tr>
                          <td className="px-5 py-3 text-gray-900">TOTAL</td>
                          <td className="px-5 py-3">{reportTotals.orders}</td>
                          <td className="px-5 py-3">{reportTotals.items.toLocaleString()}</td>
                          <td className="px-5 py-3 text-gray-900">Rs {fmt(reportTotals.total)}</td>
                          <td className="px-5 py-3 text-green-700">Rs {fmt(reportTotals.paid)}</td>
                          <td className={`px-5 py-3 ${reportTotals.due > 0 ? "text-red-600" : "text-gray-400"}`}>Rs {fmt(reportTotals.due)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}

              {/* ── All Purchases Detail Table ── */}
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    <h3 className="font-black">All Purchase Orders — {periodLabel}</h3>
                  </div>
                  <span className="text-xs opacity-60">{reportPurchases.length} orders · 50 per page</span>
                </div>

                {reportPurchases.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-semibold">No purchases this period</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-8">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date & Time</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Invoice</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Supplier</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Paid</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Balance</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Method</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase no-print">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedReport.map((p, idx) => {
                            const globalIdx = (reportCurrentPage - 1) * REPORT_ITEMS_PER_PAGE + idx + 1;
                            const mCfg = PAY_CFG[p.paymentMethod as PayMethod];
                            const isExpanded = expandedReportRows.has(p._id);
                            const totalQty = p.products.reduce((s, pr) => s + pr.quantity, 0);

                            return (
                              <React.Fragment key={p._id}>
                                <tr className={`transition-colors ${isExpanded ? "bg-blue-50/30" : "hover:bg-gray-50"}`}>
                                  {/* Row number */}
                                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{globalIdx}</td>

                                  {/* Date */}
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{fmtDate(p.createdAt)}</p>
                                    <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                                  </td>

                                  {/* Invoice */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                      <Hash className="h-3 w-3 text-gray-400" />
                                      <span className="font-mono text-xs text-gray-700">{p.supplierInvoiceNo || <span className="text-gray-300 italic">—</span>}</span>
                                    </div>
                                  </td>

                                  {/* Supplier */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                                        {p.supplier.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="font-semibold text-gray-900 whitespace-nowrap">{p.supplier.name}</span>
                                    </div>
                                  </td>

                                  {/* Items count + names preview */}
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-bold text-gray-900">{totalQty} units</p>
                                    <p className="text-xs text-gray-400 max-w-[140px] truncate">
                                      {p.products.map(pr => pr.product?.name).filter(Boolean).join(", ")}
                                    </p>
                                  </td>

                                  {/* Financials */}
                                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">Rs {fmt(p.totalAmount)}</td>
                                  <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">Rs {fmt(p.amountPaid)}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`font-bold ${p.balanceDue > 0 ? "text-red-600" : "text-gray-400"}`}>
                                      {p.balanceDue > 0 ? `Rs ${fmt(p.balanceDue)}` : "—"}
                                    </span>
                                  </td>

                                  {/* Payment method */}
                                  <td className="px-4 py-3">
                                    {mCfg ? (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${mCfg.pill}`}>
                                        {mCfg.icon}{mCfg.label}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500 text-xs">{p.paymentMethod}</span>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${p.paymentStatus === "completed" ? "bg-green-100 text-green-700" : p.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                      {p.paymentStatus}
                                    </span>
                                  </td>

                                  {/* Expand button */}
                                  <td className="px-4 py-3 no-print">
                                    <button
                                      onClick={() => {
                                        const s = new Set(expandedReportRows);
                                        s.has(p._id) ? s.delete(p._id) : s.add(p._id);
                                        setExpandedReportRows(s);
                                      }}
                                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${isExpanded ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"}`}
                                    >
                                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                      {isExpanded ? "Hide" : "View"}
                                    </button>
                                  </td>
                                </tr>

                                {/* ── Expanded item rows ── */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={11} className="px-4 py-0 bg-blue-50/40">
                                      <div className="py-3 pl-10">
                                        <div className="rounded-xl border border-blue-200 overflow-hidden shadow-sm">
                                          <div className="bg-blue-100/80 px-4 py-2 flex items-center justify-between">
                                            <span className="text-xs font-black text-blue-800 uppercase tracking-wide">
                                              Purchase Items — {p.supplier.name} · {fmtDate(p.createdAt)}
                                            </span>
                                            {p.supplierInvoiceNo && (
                                              <span className="text-xs font-mono text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">INV #{p.supplierInvoiceNo}</span>
                                            )}
                                          </div>
                                          <table className="w-full text-sm bg-white">
                                            <thead className="bg-blue-50 border-b border-blue-100">
                                              <tr>
                                                {["Product", "SKU", "Qty", "Base Rate", "Tax", "Freight", "Unit Cost", "Selling Price", "Profit/Unit", "Line Total"].map(h => (
                                                  <th key={h} className="px-4 py-2 text-left text-xs font-bold text-blue-700">{h}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-blue-50">
                                              {p.products.map((item, idx) => {
                                                const profit = item.sellingPrice - item.unitCostWithTax;
                                                const lineTotal = item.quantity * item.unitCostWithTax;
                                                return (
                                                  <tr key={idx} className="hover:bg-blue-50/30">
                                                    <td className="px-4 py-2.5 font-semibold text-gray-900">{item.product?.name}</td>
                                                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{item.product?.sku}</td>
                                                    <td className="px-4 py-2.5 font-black text-gray-900">{item.quantity}</td>
                                                    <td className="px-4 py-2.5 text-gray-700">Rs {fmt(item.buyingRate)}</td>
                                                    <td className="px-4 py-2.5 text-blue-600">
                                                      {item.taxType === "percent" || item.taxType === "percentage"
                                                        ? `${item.taxValue ?? 0}%`
                                                        : `Rs ${fmt(item.taxValue ?? 0)}`}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-purple-600">Rs {fmt(item.freightPerUnit ?? 0)}</td>
                                                    <td className="px-4 py-2.5 font-bold text-blue-700">Rs {fmt(item.unitCostWithTax)}</td>
                                                    <td className="px-4 py-2.5 font-bold text-green-700">Rs {fmt(item.sellingPrice)}</td>
                                                    <td className={`px-4 py-2.5 font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                      Rs {fmt(profit)}
                                                      <span className="text-xs font-normal ml-1 opacity-60">
                                                        ({item.unitCostWithTax > 0 ? ((profit / item.unitCostWithTax) * 100).toFixed(1) : 0}%)
                                                      </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-black text-gray-900">Rs {fmt(lineTotal)}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                              <tr>
                                                <td colSpan={2} className="px-4 py-2.5">
                                                  {p.notes && <span className="text-xs text-gray-500 italic">Note: {p.notes}</span>}
                                                </td>
                                                <td className="px-4 py-2.5 font-black">{p.products.reduce((s, pr) => s + pr.quantity, 0)}</td>
                                                <td colSpan={5} />
                                                <td className="px-4 py-2.5 text-xs text-gray-500 font-bold">Total Cost:</td>
                                                <td className="px-4 py-2.5 font-black text-gray-900">Rs {fmt(p.totalAmount)}</td>
                                              </tr>
                                              <tr className="bg-slate-800 text-white text-xs">
                                                <td colSpan={5} className="px-4 py-2 font-semibold">
                                                  Paid: <span className="text-green-400 font-black">Rs {fmt(p.amountPaid)}</span>
                                                  {p.balanceDue > 0 && <span className="ml-4 text-red-400">Balance Due: <span className="font-black">Rs {fmt(p.balanceDue)}</span></span>}
                                                </td>
                                                <td colSpan={5} className="px-4 py-2 text-right font-semibold">
                                                  Status: <span className={`font-black ${p.paymentStatus === "completed" ? "text-green-400" : p.paymentStatus === "partial" ? "text-yellow-400" : "text-red-400"}`}>{p.paymentStatus.toUpperCase()}</span>
                                                  <span className="ml-4 opacity-60">via {PAY_CFG[p.paymentMethod as PayMethod]?.label || p.paymentMethod}</span>
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

                        {/* Running totals footer */}
                        {reportPurchases.length > 0 && (
                          <tfoot className="bg-slate-900 text-white text-sm">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 font-black text-slate-300 uppercase text-xs tracking-wide">
                                Period Total ({reportPurchases.length} orders)
                              </td>
                              <td className="px-4 py-3 font-black">{reportTotals.items.toLocaleString()} units</td>
                              <td className="px-4 py-3 font-black text-white">Rs {fmt(reportTotals.total)}</td>
                              <td className="px-4 py-3 font-black text-green-400">Rs {fmt(reportTotals.paid)}</td>
                              <td className={`px-4 py-3 font-black ${reportTotals.due > 0 ? "text-red-400" : "text-slate-400"}`}>
                                {reportTotals.due > 0 ? `Rs ${fmt(reportTotals.due)}` : "—"}
                              </td>
                              <td colSpan={3} />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* ── Report Pagination ── */}
                    <Pagination
                      currentPage={reportCurrentPage}
                      totalPages={reportTotalPages}
                      onPageChange={setReportCurrentPage}
                      totalItems={reportPurchases.length}
                      itemsPerPage={REPORT_ITEMS_PER_PAGE}
                      label="purchase orders"
                    />
                  </>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ EDIT DIALOG */}
        {editPurchase && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8">
              <div className="flex items-center justify-between px-6 py-5 border-b bg-blue-50 rounded-t-2xl">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-blue-600" /> Edit Purchase — {editPurchase.supplier.name}
                </h2>
                <button onClick={() => setEditPurchase(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <Card className="p-4 bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Supplier *</label>
                      <select value={editMeta.supplierId} onChange={e => setEditMeta({ ...editMeta, supplierId: e.target.value })} className="w-full p-2 border rounded-md bg-white text-sm">
                        <option value="">Choose...</option>
                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Invoice #</label>
                      <Input value={editMeta.supplierInvoiceNo} onChange={e => setEditMeta({ ...editMeta, supplierInvoiceNo: e.target.value })} className="rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Payment Method</label>
                      <select value={editMeta.paymentMethod} onChange={e => setEditMeta({ ...editMeta, paymentMethod: e.target.value as PayMethod })} className="w-full p-2 border rounded-md bg-white text-sm">
                        {(Object.entries(PAY_CFG) as [PayMethod, typeof PAY_CFG[PayMethod]][]).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                      </select>
                      <WalletBadge method={editMeta.paymentMethod} wallet={wallet} paying={editAmountPaid} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
                      <Input value={editMeta.notes} onChange={e => setEditMeta({ ...editMeta, notes: e.target.value })} className="rounded-xl" />
                    </div>
                  </div>
                </Card>
                {renderProductRows(editProducts, setEditProducts, true)}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                  <Card className="p-4 border-orange-200 bg-orange-50/50">
                    <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-3"><WalletIcon className="h-4 w-4" /> Payment</h4>
                    <label className="text-sm font-semibold block mb-1">Amount Paid (Rs)</label>
                    <Input type="number" step="0.01" min="0" value={editMeta.amountPaid} onChange={e => setEditMeta({ ...editMeta, amountPaid: e.target.value })} className="text-lg font-bold rounded-xl" />
                    <p className="text-xs text-gray-400 mt-1">Max: Rs {fmt(editTotalBill)}</p>
                  </Card>
                  <Card className="p-6 bg-slate-900 text-white flex flex-col justify-center space-y-3 shadow-xl">
                    <div className="flex justify-between"><span className="text-lg font-bold">New Total:</span><span className="text-2xl font-bold">Rs {fmt(editTotalBill)}</span></div>
                    <div className="flex justify-between opacity-80 text-sm border-t border-slate-700 pt-2"><span>Amount Paid:</span><span className="text-green-400">(-) Rs {fmt(editAmountPaid)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-lg font-bold">Balance Due:</span>
                      <span className={`text-3xl font-black ${editBalanceDue > 0 ? "text-red-400" : "text-green-400"}`}>Rs {fmt(Math.abs(editBalanceDue))}</span>
                    </div>
                  </Card>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditPurchase(null)} className="flex-1 rounded-xl">Cancel</Button>
                  <Button onClick={handleEditSave} disabled={isEditSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl py-3 text-base font-bold">
                    {isEditSaving ? "Saving…" : "Save All Changes & Update Stock/Wallet"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ DELETE CONFIRM */}
        {deletingId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="h-8 w-8 text-red-600" /></div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Delete Purchase?</h2>
              <ul className="text-sm text-gray-600 text-left bg-red-50 rounded-xl p-4 mb-6 space-y-1">
                <li>• Reverse stock added for each product</li>
                <li>• Delete inventory batches created</li>
                <li>• Reverse supplier balance update</li>
                <li>• Reverse wallet deduction</li>
                <li>• Delete expense transaction record</li>
              </ul>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setDeletingId(null)} className="flex-1">Cancel</Button>
                <Button onClick={handleDelete} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  {isDeleting ? "Deleting…" : "Yes, Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}