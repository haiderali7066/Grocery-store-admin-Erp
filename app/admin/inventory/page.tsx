"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, AlertTriangle, Trash2, Package, Receipt, Wallet as WalletIcon,
  TrendingUp, Truck, Layers, Pencil, ShoppingBag, X, AlertCircle,
  CreditCard, Banknote, Smartphone,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BatchInfo {
  _id: string; quantity: number; buyingRate: number; taxType: string;
  taxValue: number; freightPerUnit: number; unitCostWithTax: number;
  sellingPrice: number; profitPerUnit: number; status: string; createdAt: string;
}
interface InventoryItem {
  _id: string; name: string; sku: string; stock: number;
  batches: BatchInfo[]; currentBatch?: BatchInfo; lowStockThreshold: number;
}
interface Product { _id: string; name: string; sku: string; }
interface Supplier { _id: string; name: string; balance: number; }
interface PurchaseProduct {
  productId: string; quantity: string; buyingRate: string;
  taxType: "percentage" | "fixed"; taxValue: string; freightPerUnit: string; sellingPrice: string;
}
interface PurchaseRecord {
  _id: string; supplierInvoiceNo?: string;
  supplier: { _id: string; name: string };
  products: {
    product: { _id: string; name: string; sku: string };
    quantity: number; buyingRate: number; unitCostWithTax: number; sellingPrice: number;
  }[];
  totalAmount: number; amountPaid: number; balanceDue: number;
  paymentMethod: string; paymentStatus: string; notes?: string; createdAt: string;
}
interface WalletBalances {
  cash: number; bank: number; easyPaisa: number; jazzCash: number; totalBalance: number;
}

// ── Wallet / Payment method config ───────────────────────────────────────────

type PayMethod = "cash" | "bank" | "easypaisa" | "jazzcash" | "cheque";

const PAY_CFG: Record<PayMethod, {
  label: string;
  walletKey: keyof WalletBalances | null;
  icon: React.ReactNode;
  pill: string;         // tailwind classes for the pill chip
}> = {
  cash:      { label: "Cash",          walletKey: "cash",      icon: <Banknote className="h-3.5 w-3.5" />,    pill: "text-green-700 bg-green-50 border-green-200" },
  bank:      { label: "Bank Transfer", walletKey: "bank",      icon: <CreditCard className="h-3.5 w-3.5" />,  pill: "text-blue-700 bg-blue-50 border-blue-200" },
  easypaisa: { label: "EasyPaisa",     walletKey: "easyPaisa", icon: <Smartphone className="h-3.5 w-3.5" />, pill: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  jazzcash:  { label: "JazzCash",      walletKey: "jazzCash",  icon: <Smartphone className="h-3.5 w-3.5" />, pill: "text-orange-700 bg-orange-50 border-orange-200" },
  cheque:    { label: "Cheque",        walletKey: null,         icon: <CreditCard className="h-3.5 w-3.5" />,  pill: "text-gray-700 bg-gray-50 border-gray-200" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => (n ?? 0).toFixed(2);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

// Shows available wallet balance (and warns if insufficient)
function WalletBadge({ method, wallet, paying }: { method: PayMethod; wallet: WalletBalances | null; paying?: number }) {
  if (!wallet) return null;
  const cfg = PAY_CFG[method];
  if (!cfg.walletKey) return <p className="text-xs text-gray-400 mt-1">No wallet tracking for cheques</p>;
  const bal = wallet[cfg.walletKey] as number;
  const insufficient = paying !== undefined && paying > 0 && paying > bal;
  return (
    <div className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold w-fit ${insufficient ? "bg-red-50 border-red-200 text-red-700" : cfg.pill}`}>
      {cfg.icon}
      Available: Rs {fmt(bal)}
      {insufficient && <span className="ml-1 font-bold">⚠ Low</span>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab] = useState<"inventory" | "purchases">("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [wallet, setWallet] = useState<WalletBalances | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [editPurchase, setEditPurchase] = useState<PurchaseRecord | null>(null);
  const [editForm, setEditForm] = useState({ amountPaid: "", paymentMethod: "cash", notes: "", supplierInvoiceNo: "" });
  const [isEditSaving, setIsEditSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [purchaseProducts, setPurchaseProducts] = useState<PurchaseProduct[]>([{
    productId: "", quantity: "", buyingRate: "", taxType: "percentage",
    taxValue: "0", freightPerUnit: "0", sellingPrice: "",
  }]);
  const [purchaseData, setPurchaseData] = useState({
    supplierId: "", paymentMethod: "cash" as PayMethod,
    supplierInvoiceNo: "", notes: "", amountPaid: "0",
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    await Promise.all([fetchInventory(), fetchProducts(), fetchSuppliers(), fetchPurchases(), fetchWallet()]);
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    try { const r = await fetch("/api/admin/inventory"); const d = await r.json(); setInventory(d.inventory || []); }
    catch { setInventory([]); } finally { setIsLoading(false); }
  };
  const fetchProducts = async () => {
    try { const r = await fetch("/api/admin/products"); const d = await r.json(); setProducts(d.products || []); } catch { /* silent */ }
  };
  const fetchSuppliers = async () => {
    try { const r = await fetch("/api/admin/suppliers"); const d = await r.json(); setSuppliers(d.suppliers || []); } catch { /* silent */ }
  };
  const fetchPurchases = async () => {
    try { const r = await fetch("/api/admin/purchases"); const d = await r.json(); setPurchases(d.purchases || []); } catch { /* silent */ }
  };
  const fetchWallet = async () => {
    try { const r = await fetch("/api/admin/wallet"); const d = await r.json(); setWallet(d.wallet || null); } catch { /* silent */ }
  };

  const toggleRowExpand = (id: string) => {
    const s = new Set(expandedRows); s.has(id) ? s.delete(id) : s.add(id); setExpandedRows(s);
  };

  const addProductRow = () => setPurchaseProducts([...purchaseProducts, {
    productId: "", quantity: "", buyingRate: "", taxType: "percentage", taxValue: "0", freightPerUnit: "0", sellingPrice: "",
  }]);
  const removeProductRow = (i: number) => {
    if (purchaseProducts.length > 1) setPurchaseProducts(purchaseProducts.filter((_, idx) => idx !== i));
  };
  const updateProductRow = (i: number, field: keyof PurchaseProduct, value: string) => {
    const u = [...purchaseProducts]; u[i][field] = value as any; setPurchaseProducts(u);
  };
  const calculateUnitCost = (item: PurchaseProduct) => {
    const base = parseFloat(item.buyingRate) || 0, tax = parseFloat(item.taxValue) || 0, freight = parseFloat(item.freightPerUnit) || 0;
    return (item.taxType === "percentage" ? base + base * (tax / 100) : base + tax) + freight;
  };
  const calculateItemSubtotal = (item: PurchaseProduct) => (parseFloat(item.quantity) || 0) * calculateUnitCost(item);
  const calculateProfit = (item: PurchaseProduct) => {
    const unitCost = calculateUnitCost(item), selling = parseFloat(item.sellingPrice) || 0, quantity = parseFloat(item.quantity) || 0;
    const profitPerUnit = selling - unitCost, totalProfit = profitPerUnit * quantity;
    return { profitPerUnit, totalProfit, margin: unitCost > 0 ? (profitPerUnit / unitCost) * 100 : 0 };
  };

  const totalBillAmount = purchaseProducts.reduce((t, i) => t + calculateItemSubtotal(i), 0);
  const amountPaidNum = parseFloat(purchaseData.amountPaid) || 0;
  const balanceDue = totalBillAmount - amountPaidNum;

  // Wallet sufficiency check for new purchase form
  const newMethodCfg = PAY_CFG[purchaseData.paymentMethod];
  const newWalletBal = wallet && newMethodCfg.walletKey ? (wallet[newMethodCfg.walletKey] as number) : null;
  const insufficientNew = newWalletBal !== null && amountPaidNum > newWalletBal;

  const handleBulkPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseData.supplierId) { alert("Please select a supplier"); return; }
    const valid = purchaseProducts.filter((p) => p.productId && p.quantity && p.buyingRate && p.sellingPrice);
    if (!valid.length) { alert("Please add at least one valid product with all details"); return; }
    if (insufficientNew) {
      const go = window.confirm(
        `Warning: ${newMethodCfg.label} balance is Rs ${fmt(newWalletBal!)} but you are paying Rs ${fmt(amountPaidNum)}. Wallet will go negative. Continue?`
      );
      if (!go) return;
    }
    try {
      const res = await fetch("/api/admin/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: purchaseData.supplierId,
          products: valid.map((p) => ({
            product: p.productId, quantity: parseInt(p.quantity),
            buyingRate: parseFloat(p.buyingRate), taxType: p.taxType,
            taxValue: parseFloat(p.taxValue), freightPerUnit: parseFloat(p.freightPerUnit),
            unitCostWithTax: calculateUnitCost(p), sellingPrice: parseFloat(p.sellingPrice),
          })),
          paymentMethod: purchaseData.paymentMethod,
          supplierInvoiceNo: purchaseData.supplierInvoiceNo, notes: purchaseData.notes,
          totalAmount: totalBillAmount, amountPaid: amountPaidNum, balanceDue,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Purchase created!\nTotal: Rs ${fmt(totalBillAmount)}\nPaid: Rs ${fmt(amountPaidNum)}\nBalance Due: Rs ${fmt(balanceDue)}`);
        setIsAddDialogOpen(false);
        setPurchaseProducts([{ productId: "", quantity: "", buyingRate: "", taxType: "percentage", taxValue: "0", freightPerUnit: "0", sellingPrice: "" }]);
        setPurchaseData({ supplierId: "", paymentMethod: "cash", supplierInvoiceNo: "", notes: "", amountPaid: "0" });
        fetchAll();
      } else { alert(`Failed: ${data.error || "Unknown error"}`); }
    } catch { alert("Error creating purchase"); }
  };

  const openEdit = (p: PurchaseRecord) => {
    setEditPurchase(p);
    setEditForm({ amountPaid: String(p.amountPaid), paymentMethod: p.paymentMethod, notes: p.notes || "", supplierInvoiceNo: p.supplierInvoiceNo || "" });
  };
  const handleEditSave = async () => {
    if (!editPurchase) return;
    setIsEditSaving(true);
    try {
      const res = await fetch(`/api/admin/purchases/${editPurchase._id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) { setEditPurchase(null); fetchPurchases(); fetchSuppliers(); fetchWallet(); }
      else { alert(data.message || "Failed to update"); }
    } catch { alert("Error updating purchase"); }
    finally { setIsEditSaving(false); }
  };

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

  const lowStockItems = inventory.filter((i) => i && i.stock <= i.lowStockThreshold);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header + Wallet Chips + New Purchase button ── */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory & Purchases</h1>
            <p className="text-gray-500 text-sm">Track stock, FIFO batches and purchase history</p>
          </div>
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
                      <select value={purchaseData.supplierId} onChange={(e) => setPurchaseData({ ...purchaseData, supplierId: e.target.value })}
                        className="w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none" required>
                        <option value="">Choose Supplier</option>
                        {suppliers.map((s) => (
                          <option key={s._id} value={s._id}>{s.name}{s.balance > 0 ? ` (Owe: Rs ${s.balance.toFixed(2)})` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Invoice #</label>
                      <Input value={purchaseData.supplierInvoiceNo} onChange={(e) => setPurchaseData({ ...purchaseData, supplierInvoiceNo: e.target.value })} placeholder="e.g. INV-99" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Payment Method</label>
                      <select value={purchaseData.paymentMethod}
                        onChange={(e) => setPurchaseData({ ...purchaseData, paymentMethod: e.target.value as PayMethod })}
                        className="w-full p-2 border rounded-md bg-white">
                        {(Object.entries(PAY_CFG) as [PayMethod, typeof PAY_CFG[PayMethod]][]).map(([k, c]) => (
                          <option key={k} value={k}>{c.label}</option>
                        ))}
                      </select>
                      {/* Live balance badge under the selector */}
                      <WalletBadge method={purchaseData.paymentMethod} wallet={wallet} paying={amountPaidNum} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-semibold mb-1 block">Notes (Optional)</label>
                    <Input value={purchaseData.notes} onChange={(e) => setPurchaseData({ ...purchaseData, notes: e.target.value })} placeholder="Add any additional notes..." />
                  </div>
                </Card>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5 text-green-600" /> Purchase Items</h3>
                    <Button type="button" onClick={addProductRow} variant="outline" size="sm" className="text-green-600 border-green-600">
                      <Plus className="h-4 w-4 mr-1" /> Add Product
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {purchaseProducts.map((item, index) => {
                      const { profitPerUnit, totalProfit, margin } = calculateProfit(item);
                      const unitCost = calculateUnitCost(item);
                      const baseRate = parseFloat(item.buyingRate) || 0;
                      const taxVal = parseFloat(item.taxValue) || 0;
                      const freight = parseFloat(item.freightPerUnit) || 0;
                      const taxAmount = item.taxType === "percentage" ? baseRate * (taxVal / 100) : taxVal;

                      return (
                        <Card key={index} className="p-4 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition">
                          <div className="grid grid-cols-12 gap-3 items-end mb-3">
                            <div className="col-span-12 md:col-span-3">
                              <label className="text-[10px] uppercase font-bold text-gray-400">Product *</label>
                              <select value={item.productId} onChange={(e) => updateProductRow(index, "productId", e.target.value)}
                                className="w-full mt-1 p-2 border rounded-md text-sm bg-white" required>
                                <option value="">Select...</option>
                                {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                              </select>
                            </div>
                            <div className="col-span-3 md:col-span-1">
                              <label className="text-[10px] uppercase font-bold text-gray-400">Qty *</label>
                              <Input type="number" value={item.quantity} onChange={(e) => updateProductRow(index, "quantity", e.target.value)} required className="mt-1" min="1" />
                            </div>
                            <div className="col-span-3 md:col-span-2">
                              <label className="text-[10px] uppercase font-bold text-gray-400">Base Rate (Rs) *</label>
                              <Input type="number" step="0.01" value={item.buyingRate} onChange={(e) => updateProductRow(index, "buyingRate", e.target.value)} required className="mt-1" min="0" />
                            </div>
                            <div className="col-span-3 md:col-span-2">
                              <label className="text-[10px] uppercase font-bold text-gray-400">Tax Type & Value</label>
                              <div className="flex mt-1">
                                <select value={item.taxType} onChange={(e) => updateProductRow(index, "taxType", e.target.value)}
                                  className="p-2 border rounded-l-md bg-slate-50 text-xs font-bold border-r-0">
                                  <option value="percentage">%</option>
                                  <option value="fixed">Rs</option>
                                </select>
                                <Input type="number" step="0.01" value={item.taxValue} onChange={(e) => updateProductRow(index, "taxValue", e.target.value)} className="rounded-l-none" min="0" />
                              </div>
                            </div>
                            <div className="col-span-3 md:col-span-2">
                              <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1"><Truck className="h-3 w-3" />Freight/Unit (Rs)</label>
                              <Input type="number" step="0.01" value={item.freightPerUnit} onChange={(e) => updateProductRow(index, "freightPerUnit", e.target.value)} className="mt-1" min="0" />
                            </div>
                            <div className="col-span-3 md:col-span-1">
                              {purchaseProducts.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeProductRow(index)} className="text-red-400 w-full hover:text-red-600 hover:bg-red-50">
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
                                  <Input type="number" step="0.01" value={item.sellingPrice} onChange={(e) => updateProductRow(index, "sellingPrice", e.target.value)} required className="h-8" min="0" />
                                </div>
                              </div>
                            </div>
                          )}

                          {item.quantity && item.buyingRate && item.sellingPrice && (
                            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div><span className="text-gray-600">Total Cost:</span><p className="font-bold">Rs {calculateItemSubtotal(item).toFixed(2)}</p></div>
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
                </div>

                {/* Payment & summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                  <Card className="p-4 border-orange-200 bg-orange-50/50">
                    <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-3">
                      <WalletIcon className="h-4 w-4" /> Payment
                    </h4>
                    <div>
                      <label className="text-sm font-semibold block mb-1">Amount Paid to Supplier Now</label>
                      <Input type="number" step="0.01" value={purchaseData.amountPaid}
                        onChange={(e) => setPurchaseData({ ...purchaseData, amountPaid: e.target.value })}
                        className={`text-lg font-bold bg-white ${insufficientNew ? "border-red-400" : "border-orange-300"}`} min="0" />
                    </div>

                    {/* Wallet balance preview box */}
                    {newWalletBal !== null && amountPaidNum > 0 && (
                      <div className={`mt-3 p-3 rounded-xl border text-sm space-y-1 ${insufficientNew ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{newMethodCfg.label} balance now:</span>
                          <span className="font-bold">Rs {fmt(newWalletBal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">After payment:</span>
                          <span className={`font-black ${(newWalletBal - amountPaidNum) < 0 ? "text-red-600" : "text-green-700"}`}>
                            Rs {fmt(newWalletBal - amountPaidNum)}
                          </span>
                        </div>
                        {insufficientNew && <p className="text-red-600 text-xs font-semibold pt-0.5">⚠ Wallet will go negative — you'll be warned before submitting</p>}
                      </div>
                    )}
                  </Card>

                  <Card className="p-6 bg-slate-900 text-white flex flex-col justify-center space-y-3 shadow-xl">
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-bold">Total Bill:</span>
                      <span className="text-2xl font-bold">Rs {fmt(totalBillAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center opacity-80 text-sm border-t border-slate-700 pt-2">
                      <span>Amount Paid:</span>
                      <span className="text-green-400">(-) Rs {fmt(amountPaidNum)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-lg font-bold">Balance Due (to supplier):</span>
                      <span className={`text-3xl font-black ${balanceDue > 0 ? "text-red-400" : "text-green-400"}`}>
                        Rs {fmt(Math.abs(balanceDue))}
                      </span>
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

        {/* Wallet balance chips row */}
        {wallet && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 font-semibold self-center mr-1">Wallet:</span>
            {(Object.entries(PAY_CFG) as [PayMethod, typeof PAY_CFG[PayMethod]][])
              .filter(([, c]) => c.walletKey !== null)
              .map(([key, c]) => {
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
        <Card className="p-4 bg-orange-50 border-2 border-orange-300 shadow-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-bold text-orange-900 text-lg">Low Stock Alert</p>
              <p className="text-sm text-orange-700">{lowStockItems.length} products need immediate restocking</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["inventory", "purchases"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "inventory"
              ? <span className="flex items-center gap-1.5"><Package className="h-4 w-4" />Inventory</span>
              : <span className="flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" />Purchases</span>}
          </button>
        ))}
      </div>

      {/* ── INVENTORY TAB ── */}
      {tab === "inventory" && (
        <Card className="shadow-xl overflow-hidden border-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto" />
                <p className="mt-4 text-gray-600">Loading inventory...</p>
              </div>
            ) : inventory.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b-2">
                  <tr>{["Product","SKU","Stock","Current Batch","Unit Cost","Selling Price","Profit/Unit","Status","Batches"].map((h) => (
                    <th key={h} className="px-6 py-4 font-bold text-gray-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {inventory.map((item) => (
                    <React.Fragment key={item._id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-gray-600">{item.sku}</td>
                        <td className="px-6 py-4"><span className="text-lg font-bold">{item.stock}</span><span className="text-xs text-gray-400 ml-1">units</span></td>
                        <td className="px-6 py-4">
                          {item.currentBatch
                            ? <div className="text-sm"><span className="font-semibold text-gray-700">{item.currentBatch.quantity} units</span><p className="text-xs text-gray-500">Active batch</p></div>
                            : <span className="text-gray-400">No active batch</span>}
                        </td>
                        <td className="px-6 py-4">
                          {item.currentBatch
                            ? <div><span className="text-lg font-bold text-blue-600">Rs {item.currentBatch.unitCostWithTax.toFixed(2)}</span><p className="text-xs text-gray-500">Base + Tax + Freight</p></div>
                            : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          {item.currentBatch ? <span className="text-lg font-bold text-green-600">Rs {item.currentBatch.sellingPrice.toFixed(2)}</span> : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          {item.currentBatch
                            ? <div>
                                <span className={`text-lg font-bold ${item.currentBatch.profitPerUnit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs {item.currentBatch.profitPerUnit.toFixed(2)}</span>
                                <p className="text-xs text-gray-500">{((item.currentBatch.profitPerUnit / item.currentBatch.unitCostWithTax) * 100).toFixed(1)}% margin</p>
                              </div>
                            : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${item.stock <= item.lowStockThreshold ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {item.stock <= item.lowStockThreshold ? "Low" : "Healthy"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="outline" size="sm" onClick={() => toggleRowExpand(item._id)} className="text-blue-600 hover:bg-blue-50">
                            <Layers className="h-4 w-4 mr-1" />{expandedRows.has(item._id) ? "Hide" : "View"} ({item.batches?.length || 0})
                          </Button>
                        </td>
                      </tr>
                      {expandedRows.has(item._id) && (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 bg-gray-50">
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4" />FIFO Batch History (Oldest First)</h4>
                            {item.batches?.length > 0 ? (
                              <div className="grid gap-2">
                                {item.batches.map((batch, idx) => (
                                  <div key={batch._id} className={`p-3 rounded-lg border-2 ${batch.status === "active" ? "bg-green-50 border-green-300" : batch.status === "partial" ? "bg-yellow-50 border-yellow-300" : "bg-gray-100 border-gray-300"}`}>
                                    <div className="grid grid-cols-8 gap-4 text-sm">
                                      <div><span className="text-gray-600">Batch #{idx + 1}</span><p className="font-semibold">{batch.quantity} units</p></div>
                                      <div><span className="text-gray-600">Base Rate</span><p className="font-semibold">Rs {batch.buyingRate.toFixed(2)}</p></div>
                                      <div><span className="text-gray-600">Tax</span><p className="font-semibold">{batch.taxType === "percentage" || batch.taxType === "percent" ? `${batch.taxValue}%` : `Rs ${batch.taxValue}`}</p></div>
                                      <div><span className="text-gray-600">Freight/Unit</span><p className="font-semibold text-purple-600">Rs {batch.freightPerUnit.toFixed(2)}</p></div>
                                      <div><span className="text-gray-600">Unit Cost</span><p className="font-semibold text-blue-600">Rs {batch.unitCostWithTax.toFixed(2)}</p></div>
                                      <div><span className="text-gray-600">Selling</span><p className="font-semibold text-green-600">Rs {batch.sellingPrice.toFixed(2)}</p></div>
                                      <div><span className="text-gray-600">Profit/Unit</span><p className={`font-semibold ${batch.profitPerUnit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs {batch.profitPerUnit.toFixed(2)}</p></div>
                                      <div><span className="text-gray-600">Status</span><p className="font-semibold capitalize">{batch.status}</p></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : <p className="text-gray-500 text-sm">No batches available</p>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No inventory items found</p>
                <p className="text-gray-400 text-sm mt-2">Create a purchase order to add stock</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── PURCHASES TAB ── */}
      {tab === "purchases" && (
        <Card className="shadow-xl overflow-hidden border-0">
          <div className="overflow-x-auto">
            {purchases.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b-2">
                  <tr>{["Date","Invoice","Supplier","Items","Total","Paid","Balance","Method","Status","Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 font-bold text-gray-600 text-sm">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {purchases.map((p) => {
                    const mCfg = PAY_CFG[p.paymentMethod as PayMethod];
                    return (
                      <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                        <td className="px-5 py-4 text-sm font-mono text-gray-700">{p.supplierInvoiceNo || "—"}</td>
                        <td className="px-5 py-4 font-semibold text-gray-900">{p.supplier?.name}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{p.products?.length} item{p.products?.length !== 1 ? "s" : ""}</td>
                        <td className="px-5 py-4 font-bold text-gray-900">Rs {fmt(p.totalAmount)}</td>
                        <td className="px-5 py-4 text-green-600 font-semibold">Rs {fmt(p.amountPaid)}</td>
                        <td className="px-5 py-4"><span className={`font-bold ${p.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>Rs {fmt(p.balanceDue)}</span></td>
                        <td className="px-5 py-4">
                          {mCfg ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${mCfg.pill}`}>{mCfg.icon}{mCfg.label}</span>
                          ) : <span className="text-gray-500 text-sm">{p.paymentMethod}</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${p.paymentStatus === "completed" ? "bg-green-100 text-green-700" : p.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{p.paymentStatus}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="gap-1.5 text-blue-600 hover:bg-blue-50 border-blue-200"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => setDeletingId(p._id)} className="gap-1.5 text-red-500 hover:bg-red-50 border-red-200"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No purchases yet</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── EDIT DIALOG ── */}
      {editPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><Pencil className="h-5 w-5 text-blue-600" />Edit Purchase</h2>
              <button onClick={() => setEditPurchase(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm space-y-1">
              <p><span className="text-gray-500">Supplier:</span> <span className="font-semibold">{editPurchase.supplier?.name}</span></p>
              <p><span className="text-gray-500">Total Bill:</span> <span className="font-bold">Rs {fmt(editPurchase.totalAmount)}</span></p>
              <p className="text-xs text-gray-400 mt-1">Only payment details can be edited. To change products, delete and recreate the purchase.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Invoice #</label>
                <Input value={editForm.supplierInvoiceNo} onChange={(e) => setEditForm({ ...editForm, supplierInvoiceNo: e.target.value })} placeholder="INV-99" className="rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Amount Paid (Rs)</label>
                <Input type="number" step="0.01" min="0" max={editPurchase.totalAmount}
                  value={editForm.amountPaid} onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })} className="rounded-xl text-lg font-bold" />
                <p className="text-xs text-gray-400 mt-1">Max: Rs {fmt(editPurchase.totalAmount)}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Payment Method</label>
                <select value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-white text-sm">
                  {(Object.entries(PAY_CFG) as [PayMethod, typeof PAY_CFG[PayMethod]][]).map(([k, c]) => (
                    <option key={k} value={k}>{c.label}</option>
                  ))}
                </select>
                {/* Live balance badge in edit dialog too */}
                <WalletBadge method={editForm.paymentMethod as PayMethod} wallet={wallet} paying={parseFloat(editForm.amountPaid) || 0} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notes</label>
                <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional notes..." className="rounded-xl" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditPurchase(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleEditSave} disabled={isEditSaving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {isEditSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Delete Purchase?</h2>
            <p className="text-gray-500 text-sm mb-1">This will permanently:</p>
            <ul className="text-sm text-gray-600 text-left bg-red-50 rounded-xl p-4 mb-6 space-y-1">
              <li>• Reverse the stock added for each product</li>
              <li>• Delete the inventory batches created</li>
              <li>• Reverse the supplier balance update</li>
              <li>• Reverse the wallet deduction</li>
              <li>• Delete the expense transaction record</li>
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
  );
}