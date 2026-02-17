"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle, XCircle, Clock, Eye, Plus, Package, ShoppingBag,
  TrendingDown, Trash2, RotateCcw, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReturnItem {
  productId?: string;
  name: string;
  returnQty: number;
  maxQty: number;
  unitPrice: number;
  restock: boolean;
}

interface RefundRequest {
  _id: string;
  order?: { _id: string; orderNumber: string; total: number; items: any[] };
  orderNumber?: string;
  returnType: "online" | "pos_manual";
  requestedAmount: number;
  refundedAmount?: number;
  deliveryCost?: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "completed";
  approvedBy?: { name: string };
  approvedAt?: string;
  notes?: string;
  returnItems?: {
    name: string; returnQty: number; unitPrice: number; lineTotal: number; restock: boolean;
  }[];
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => (n ?? 0).toFixed(2);

const STATUS_BADGE: Record<string, { bg: string; text: string; Icon: any }> = {
  pending:   { bg: "bg-yellow-100", text: "text-yellow-800", Icon: Clock },
  approved:  { bg: "bg-blue-100",   text: "text-blue-800",   Icon: CheckCircle },
  rejected:  { bg: "bg-red-100",    text: "text-red-800",    Icon: XCircle },
  completed: { bg: "bg-green-100",  text: "text-green-800",  Icon: CheckCircle },
};

function StatusBadge({ status }: { status: string }) {
  const { bg, text, Icon } = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${bg} ${text}`}>
      <Icon size={14} />{status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
function TypeBadge({ type }: { type: string }) {
  return type === "online" ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><ShoppingBag size={12} />Online</span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800"><Package size={12} />POS Manual</span>
  );
}

// ── Empty return item ─────────────────────────────────────────────────────────

const emptyItem = (): ReturnItem => ({ name: "", returnQty: 1, maxQty: 99, unitPrice: 0, restock: true });

// ── Component ─────────────────────────────────────────────────────────────────

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Detail dialog
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalAmount, setApprovalAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Manual return dialog
  const [showManualReturn, setShowManualReturn] = useState(false);
  const [manualForm, setManualForm] = useState({
    orderNumber: "", reason: "defective", notes: "",
  });
  // Mode: "whole" = whole-bill amount, "items" = item picker
  const [returnMode, setReturnMode] = useState<"whole" | "items">("items");
  const [wholeBillAmount, setWholeBillAmount] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([emptyItem()]);

  useEffect(() => { fetchRefunds(); }, []);

  const fetchRefunds = async () => {
    try {
      const res = await fetch("/api/admin/refunds");
      if (!res.ok) { setRefunds([]); setFilteredRefunds([]); return; }
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) { setRefunds([]); setFilteredRefunds([]); return; }
      const data = await res.json();
      setRefunds(Array.isArray(data) ? data : []);
      setFilteredRefunds(Array.isArray(data) ? data : []);
    } catch { setRefunds([]); setFilteredRefunds([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!Array.isArray(refunds)) return setFilteredRefunds([]);
    let f = [...refunds];
    if (statusFilter !== "all") f = f.filter((r) => r.status === statusFilter);
    if (typeFilter !== "all") f = f.filter((r) => r.returnType === typeFilter);
    if (searchTerm) f = f.filter((r) => {
      const n = r.order?.orderNumber || r.orderNumber || "";
      return n.toLowerCase().includes(searchTerm.toLowerCase()) || r.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setFilteredRefunds(f);
  }, [refunds, statusFilter, typeFilter, searchTerm]);

  // ── Approve / Reject ───────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!selectedRefund) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/refunds/${selectedRefund._id}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalAmount: parseFloat(approvalAmount), notes: approvalNotes }),
      });
      if (res.ok) { alert("Refund approved!"); setShowDetail(false); fetchRefunds(); }
      else { const e = await res.json(); alert(`Error: ${e.error || "Failed to approve"}`); }
    } catch { alert("Error approving refund"); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/refunds/${selectedRefund._id}/reject`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: approvalNotes }),
      });
      if (res.ok) { alert("Refund rejected"); setShowDetail(false); fetchRefunds(); }
      else { const e = await res.json(); alert(`Error: ${e.error || "Failed to reject"}`); }
    } catch { alert("Error rejecting refund"); }
    finally { setActionLoading(false); }
  };

  // ── Item-picker helpers ────────────────────────────────────────────────────

  const addItem = () => setReturnItems((prev) => [...prev, emptyItem()]);

  const removeItem = (i: number) =>
    setReturnItems((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const updateItem = (i: number, field: keyof ReturnItem, value: any) =>
    setReturnItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const itemsTotal = returnItems.reduce((sum, item) => sum + (item.unitPrice * item.returnQty), 0);

  const resetManualForm = () => {
    setManualForm({ orderNumber: "", reason: "defective", notes: "" });
    setReturnMode("items");
    setWholeBillAmount("");
    setReturnItems([emptyItem()]);
  };

  // ── Manual return submit ───────────────────────────────────────────────────

  const handleManualReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.orderNumber) { alert("Order/Sale number is required"); return; }

    if (returnMode === "whole") {
      if (!wholeBillAmount || parseFloat(wholeBillAmount) <= 0) { alert("Enter a valid return amount"); return; }
    } else {
      const valid = returnItems.filter((i) => i.name.trim() && i.returnQty > 0);
      if (!valid.length) { alert("Add at least one valid item"); return; }
    }

    setActionLoading(true);
    try {
      const payload: any = {
        orderNumber: manualForm.orderNumber,
        reason: manualForm.reason,
        notes: manualForm.notes,
      };

      if (returnMode === "whole") {
        payload.amount = parseFloat(wholeBillAmount);
      } else {
        payload.items = returnItems.filter((i) => i.name.trim() && i.returnQty > 0).map((i) => ({
          productId: i.productId || undefined,
          name: i.name,
          returnQty: i.returnQty,
          unitPrice: i.unitPrice,
          restock: i.restock,
        }));
      }

      const res = await fetch("/api/admin/refunds/manual", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Return created successfully!");
        setShowManualReturn(false);
        resetManualForm();
        fetchRefunds();
      } else { alert(`Error: ${data.error || "Failed to create return"}`); }
    } catch { alert("Error creating return"); }
    finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="p-6 text-center">
      <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-600">Loading refund requests...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Returns & Refunds</h1>
            <p className="text-gray-600">Manage online refunds and POS returns</p>
          </div>

          {/* Manual return dialog */}
          <Dialog open={showManualReturn} onOpenChange={(v) => { setShowManualReturn(v); if (!v) resetManualForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" /> POS Manual Return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-orange-600" /> Create Manual POS Return
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleManualReturn} className="space-y-5 mt-2">
                {/* Order number + reason */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sale / Order # *</label>
                    <Input value={manualForm.orderNumber}
                      onChange={(e) => setManualForm({ ...manualForm, orderNumber: e.target.value })}
                      placeholder="SALE-000123" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason *</label>
                    <select value={manualForm.reason} onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                      <option value="defective">Defective Product</option>
                      <option value="wrong_item">Wrong Item</option>
                      <option value="expired">Expired</option>
                      <option value="customer_request">Customer Request</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Return mode toggle */}
                <div>
                  <label className="block text-sm font-medium mb-2">Return Type</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setReturnMode("items")}
                      className={`flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${returnMode === "items" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      📦 Item-by-Item Return
                      <p className="text-[10px] font-normal mt-0.5 opacity-70">Pick specific items + qty</p>
                    </button>
                    <button type="button" onClick={() => setReturnMode("whole")}
                      className={`flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${returnMode === "whole" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      💵 Whole-Bill Amount
                      <p className="text-[10px] font-normal mt-0.5 opacity-70">Enter total return amount</p>
                    </button>
                  </div>
                </div>

                {/* ── ITEM PICKER ── */}
                {returnMode === "items" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700">Return Items</label>
                      <Button type="button" size="sm" variant="outline" onClick={addItem} className="text-orange-600 border-orange-300 hover:bg-orange-50">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                      </Button>
                    </div>

                    {returnItems.map((item, i) => (
                      <Card key={i} className="p-3 border border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-12 gap-2 items-end">
                          {/* Item name */}
                          <div className="col-span-12 sm:col-span-4">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Item Name *</label>
                            <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)}
                              placeholder="e.g. Rice 5kg" className="mt-1 h-8 text-sm" required />
                          </div>

                          {/* Qty */}
                          <div className="col-span-4 sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Return Qty *</label>
                            <Input type="number" min="1" max={item.maxQty} value={item.returnQty}
                              onChange={(e) => updateItem(i, "returnQty", Math.max(1, parseInt(e.target.value) || 1))}
                              className="mt-1 h-8 text-sm" />
                          </div>

                          {/* Unit price */}
                          <div className="col-span-4 sm:col-span-3">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Unit Price (Rs)</label>
                            <Input type="number" step="0.01" min="0" value={item.unitPrice}
                              onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="mt-1 h-8 text-sm" />
                          </div>

                          {/* Line total */}
                          <div className="col-span-4 sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Line Total</label>
                            <div className="mt-1 h-8 flex items-center px-2 bg-white border rounded-md text-sm font-bold text-green-700">
                              Rs {fmt(item.unitPrice * item.returnQty)}
                            </div>
                          </div>

                          {/* Delete */}
                          <div className="col-span-4 sm:col-span-1 flex items-end justify-end pb-0.5">
                            <button type="button" onClick={() => removeItem(i)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Remove">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Restock toggle */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <input type="checkbox" id={`restock-${i}`} checked={item.restock}
                            onChange={(e) => updateItem(i, "restock", e.target.checked)}
                            className="w-4 h-4 accent-orange-500" />
                          <label htmlFor={`restock-${i}`} className="text-xs font-semibold text-gray-600 cursor-pointer">
                            Add back to inventory stock
                          </label>
                          {item.restock && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">+{item.returnQty} stock</span>
                          )}
                        </div>
                      </Card>
                    ))}

                    {/* Items total */}
                    {returnItems.some((i) => i.unitPrice > 0) && (
                      <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                        <span className="text-sm font-bold text-gray-700">Total Return Amount:</span>
                        <span className="text-xl font-black text-orange-700">Rs {fmt(itemsTotal)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── WHOLE BILL ── */}
                {returnMode === "whole" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Return Amount (Rs) *</label>
                    <Input type="number" step="0.01" min="0.01" value={wholeBillAmount}
                      onChange={(e) => setWholeBillAmount(e.target.value)}
                      placeholder="e.g. 1500.00" className="text-lg font-bold" required />
                    <p className="text-xs text-gray-400 mt-1">
                      This will be recorded as a single POS return without individual item breakdown.
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Textarea value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} rows={2} placeholder="Optional — e.g. customer brought receipt, item condition noted..." />
                </div>

                {/* Restock note for whole-bill mode */}
                {returnMode === "whole" && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>To add stock back to inventory, use <strong>Item-by-Item</strong> mode and check the "restock" box per item.</span>
                  </div>
                )}

                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 py-5 text-base font-bold" disabled={actionLoading}>
                  {actionLoading ? "Creating..." : "✓ Create Return & Update Stock"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Total Pending</p><p className="text-2xl font-bold text-yellow-600">{refunds.filter((r) => r.status === "pending").length}</p></div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-60" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Online Refunds</p><p className="text-2xl font-bold text-purple-600">{refunds.filter((r) => r.returnType === "online").length}</p></div>
              <ShoppingBag className="h-8 w-8 text-purple-600 opacity-60" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">POS Returns</p><p className="text-2xl font-bold text-orange-600">{refunds.filter((r) => r.returnType === "pos_manual").length}</p></div>
              <Package className="h-8 w-8 text-orange-600 opacity-60" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Refunded</p>
                <p className="text-2xl font-bold text-red-600">
                  Rs {refunds.filter((r) => r.status === "completed" || r.status === "approved").reduce((s, r) => s + (r.refundedAmount || 0), 0).toFixed(0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600 opacity-60" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="online">Online Orders</SelectItem>
                  <SelectItem value="pos_manual">POS Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <Input placeholder="Order number or reason..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* List */}
        {filteredRefunds.length > 0 ? (
          <div className="space-y-4">
            {filteredRefunds.map((refund) => (
              <Card key={refund._id} className="p-4 hover:shadow-lg transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{refund.order?.orderNumber || refund.orderNumber || "N/A"}</h3>
                      <StatusBadge status={refund.status} />
                      <TypeBadge type={refund.returnType} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div><p className="text-gray-500">Requested</p><p className="font-semibold text-red-600">Rs {fmt(refund.requestedAmount)}</p></div>
                      {refund.refundedAmount ? <div><p className="text-gray-500">Refunded</p><p className="font-semibold text-green-600">Rs {fmt(refund.refundedAmount)}</p></div> : null}
                      {refund.deliveryCost && refund.deliveryCost > 0 ? <div><p className="text-gray-500">Delivery Cost</p><p className="font-semibold text-orange-600">- Rs {fmt(refund.deliveryCost)}</p></div> : null}
                      <div><p className="text-gray-500">Reason</p><p className="font-semibold capitalize">{refund.reason.replace(/_/g, " ")}</p></div>
                      <div><p className="text-gray-500">Date</p><p className="font-semibold">{new Date(refund.createdAt).toLocaleDateString()}</p></div>
                    </div>
                    {/* Item summary pills */}
                    {refund.returnItems && refund.returnItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {refund.returnItems.map((it, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">
                            {it.name} × {it.returnQty}
                            {it.restock && <span className="text-green-600 font-bold">↩</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => { setSelectedRefund(refund); setShowDetail(true); setApprovalAmount(refund.returnType === "online" ? String(refund.requestedAmount - 300) : String(refund.requestedAmount)); setApprovalNotes(""); }}
                    variant="outline" size="sm">
                    <Eye size={16} className="mr-2" /> View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center"><p className="text-gray-500">No refund requests found</p></Card>
        )}

        {/* ── Detail Dialog ── */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Refund Request Details</DialogTitle></DialogHeader>
            {selectedRefund && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div><p className="text-sm text-gray-600">Order Number</p><p className="font-semibold">{selectedRefund.order?.orderNumber || selectedRefund.orderNumber}</p></div>
                  <div><p className="text-sm text-gray-600">Type</p><TypeBadge type={selectedRefund.returnType} /></div>
                  <div><p className="text-sm text-gray-600">Requested Amount</p><p className="font-semibold text-red-600">Rs {fmt(selectedRefund.requestedAmount)}</p></div>
                  <div><p className="text-sm text-gray-600">Status</p><StatusBadge status={selectedRefund.status} /></div>
                  <div><p className="text-sm text-gray-600">Reason</p><p className="font-semibold capitalize">{selectedRefund.reason.replace(/_/g, " ")}</p></div>
                  <div><p className="text-sm text-gray-600">Date</p><p className="font-semibold">{new Date(selectedRefund.createdAt).toLocaleDateString()}</p></div>
                </div>

                {/* Item breakdown if available */}
                {selectedRefund.returnItems && selectedRefund.returnItems.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Returned Items:</p>
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            {["Item","Qty","Unit Price","Line Total","Restocked"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedRefund.returnItems.map((it, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{it.name}</td>
                              <td className="px-3 py-2">{it.returnQty}</td>
                              <td className="px-3 py-2">Rs {fmt(it.unitPrice)}</td>
                              <td className="px-3 py-2 font-bold text-green-700">Rs {fmt(it.lineTotal)}</td>
                              <td className="px-3 py-2">
                                {it.restock
                                  ? <span className="text-green-600 font-semibold text-xs">✓ Yes</span>
                                  : <span className="text-gray-400 text-xs">No</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-orange-50 border-t">
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold">Total:</td>
                            <td colSpan={2} className="px-3 py-2 text-base font-black text-orange-700">
                              Rs {fmt(selectedRefund.returnItems.reduce((s, i) => s + i.lineTotal, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {selectedRefund.returnType === "online" && (
                  <Card className="p-4 bg-orange-50 border-orange-200">
                    <p className="text-sm font-semibold text-orange-800">⚠️ Online Order: Rs 300 delivery cost will be deducted from refund</p>
                  </Card>
                )}

                {selectedRefund.status === "pending" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Approval Amount (Rs)</label>
                      <Input type="number" step="0.01" value={approvalAmount} onChange={(e) => setApprovalAmount(e.target.value)} />
                      <p className="text-xs text-gray-500 mt-1">{selectedRefund.returnType === "online" ? "Delivery cost (Rs 300) already deducted" : "Full amount for POS return"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={3} />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700" disabled={actionLoading}>
                        <CheckCircle className="h-4 w-4 mr-2" />{actionLoading ? "Processing..." : "Approve & Restock"}
                      </Button>
                      <Button onClick={handleReject} variant="outline" className="flex-1 border-red-600 text-red-600 hover:bg-red-50" disabled={actionLoading}>
                        <XCircle className="h-4 w-4 mr-2" />Reject
                      </Button>
                    </div>
                  </>
                )}

                {selectedRefund.status !== "pending" && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Processing Info:</p>
                    {selectedRefund.refundedAmount ? <p className="text-sm">Refunded: Rs {fmt(selectedRefund.refundedAmount)}</p> : null}
                    {selectedRefund.approvedBy ? <p className="text-sm">Processed by: {selectedRefund.approvedBy.name}</p> : null}
                    {selectedRefund.notes ? <p className="text-sm mt-2">Notes: {selectedRefund.notes}</p> : null}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}