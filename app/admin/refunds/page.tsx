// app/admin/refunds/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Plus,
  Package,
  ShoppingBag,
  TrendingDown,
  RotateCcw,
  Search,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

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
    name: string;
    returnQty: number;
    unitPrice: number;
    lineTotal: number;
    restock: boolean;
  }[];
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => (n ?? 0).toFixed(2);

const STATUS_BADGE: Record<string, { bg: string; text: string; Icon: any }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", Icon: Clock },
  approved: { bg: "bg-blue-100", text: "text-blue-800", Icon: CheckCircle },
  rejected: { bg: "bg-red-100", text: "text-red-800", Icon: XCircle },
  completed: { bg: "bg-green-100", text: "text-green-800", Icon: CheckCircle },
};

function StatusBadge({ status }: { status: string }) {
  const { bg, text, Icon } = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${bg} ${text}`}
    >
      <Icon size={14} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return type === "online" ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
      <ShoppingBag size={12} />
      Online
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
      <Package size={12} />
      POS Manual
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Detail dialog
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(
    null,
  );
  const [showDetail, setShowDetail] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalAmount, setApprovalAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Easy Return dialog
  const [showEasyReturn, setShowEasyReturn] = useState(false);
  const [searchOrderNumber, setSearchOrderNumber] = useState("");
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [returnReason, setReturnReason] = useState("customer_request");
  const [returnNotes, setReturnNotes] = useState("");

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const res = await fetch("/api/admin/refunds");
      if (!res.ok) {
        setRefunds([]);
        setFilteredRefunds([]);
        return;
      }
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        setRefunds([]);
        setFilteredRefunds([]);
        return;
      }
      const data = await res.json();
      setRefunds(Array.isArray(data) ? data : []);
      setFilteredRefunds(Array.isArray(data) ? data : []);
    } catch {
      setRefunds([]);
      setFilteredRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Array.isArray(refunds)) return setFilteredRefunds([]);
    let f = [...refunds];
    if (statusFilter !== "all") f = f.filter((r) => r.status === statusFilter);
    if (typeFilter !== "all") f = f.filter((r) => r.returnType === typeFilter);
    if (searchTerm)
      f = f.filter((r) => {
        const n = r.order?.orderNumber || r.orderNumber || "";
        return (
          n.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.reason?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    setFilteredRefunds(f);
  }, [refunds, statusFilter, typeFilter, searchTerm]);

  // ── Search Order ───────────────────────────────────────────────────────────
  const handleSearchOrder = async () => {
    if (!searchOrderNumber.trim()) {
      alert("Please enter an order number");
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/admin/orders/search?orderNumber=${encodeURIComponent(searchOrderNumber.trim())}`,
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Order not found");
      }

      const data = await res.json();
      setSearchedOrder(data.order);
      setSelectedItems(new Set());
    } catch (err: any) {
      alert(err.message || "Failed to find order");
      setSearchedOrder(null);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Toggle Item Selection ──────────────────────────────────────────────────
  const toggleItemSelection = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  // ── Calculate Selected Total ───────────────────────────────────────────────
  const selectedTotal =
    searchedOrder?.items
      .filter((_: any, i: number) => selectedItems.has(i))
      .reduce((sum: number, item: any) => sum + item.subtotal, 0) || 0;

  // ── Handle Easy Return ─────────────────────────────────────────────────────
  const handleEasyReturn = async () => {
    if (!searchedOrder) {
      alert("Please search for an order first");
      return;
    }

    if (selectedItems.size === 0) {
      alert("Please select at least one item to return");
      return;
    }

    setActionLoading(true);
    try {
      const selectedItemsData = searchedOrder.items
        .filter((_: any, i: number) => selectedItems.has(i))
        .map((item: any) => ({
          productId: item.productId,
          name: item.name,
          returnQty: item.quantity,
          unitPrice: item.price,
          restock: true,
        }));

      const res = await fetch("/api/admin/refunds/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: searchedOrder.orderNumber,
          reason: returnReason,
          notes: returnNotes,
          items: selectedItemsData,
          paymentMethod: searchedOrder.paymentMethod || "cash",
          orderType: searchedOrder.shippingCost > 0 ? "online" : "pos",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(
          `✅ ${data.message}\n\n💰 Refunded: Rs. ${data.refundAmount.toLocaleString()}\n💵 Wallet Balance: Rs. ${data.walletBalance.toLocaleString()}`,
        );
        resetEasyReturn();
        fetchRefunds();
      } else {
        alert(`Error: ${data.error || "Failed to process return"}`);
      }
    } catch (err) {
      alert("Error processing return");
    } finally {
      setActionLoading(false);
    }
  };

  const resetEasyReturn = () => {
    setShowEasyReturn(false);
    setSearchedOrder(null);
    setSearchOrderNumber("");
    setSelectedItems(new Set());
    setReturnReason("customer_request");
    setReturnNotes("");
  };

  // ── Approve / Reject (for online returns) ──────────────────────────────────
  const handleApprove = async () => {
    if (!selectedRefund) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/refunds/${selectedRefund._id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvalAmount: parseFloat(approvalAmount),
            notes: approvalNotes,
          }),
        },
      );
      if (res.ok) {
        alert("Refund approved!");
        setShowDetail(false);
        fetchRefunds();
      } else {
        const e = await res.json();
        alert(`Error: ${e.error || "Failed to approve"}`);
      }
    } catch {
      alert("Error approving refund");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/refunds/${selectedRefund._id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: approvalNotes }),
        },
      );
      if (res.ok) {
        alert("Refund rejected");
        setShowDetail(false);
        fetchRefunds();
      } else {
        const e = await res.json();
        alert(`Error: ${e.error || "Failed to reject"}`);
      }
    } catch {
      alert("Error rejecting refund");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
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
            <h1 className="text-3xl font-bold text-gray-900">
              Returns & Refunds
            </h1>
            <p className="text-gray-600">
              Manage online refunds and POS returns
            </p>
          </div>

          {/* Easy Return Dialog */}
          <Dialog open={showEasyReturn} onOpenChange={setShowEasyReturn}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" /> Easy POS Return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-orange-600" /> Easy Return
                  - Search & Select Items
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Step 1: Search Order */}
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <label className="block text-sm font-bold mb-2">
                    Step 1: Find Order
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={searchOrderNumber}
                      onChange={(e) => setSearchOrderNumber(e.target.value)}
                      placeholder="Enter Order Number (e.g., ORD-123 or SALE-456)"
                      className="flex-1"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearchOrder()
                      }
                    />
                    <Button
                      onClick={handleSearchOrder}
                      disabled={isSearching || !searchOrderNumber.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {isSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>
                </Card>

                {/* Step 2: Display Order & Select Items */}
                {searchedOrder && (
                  <>
                    <Card className="p-4 bg-green-50 border-green-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-green-900">
                            Order Found: {searchedOrder.orderNumber}
                          </h3>
                          <p className="text-sm text-green-700">
                            Total: Rs. {searchedOrder.total.toLocaleString()} |
                            Payment:{" "}
                            {searchedOrder.paymentMethod?.toUpperCase()} | Date:{" "}
                            {new Date(
                              searchedOrder.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchedOrder(null);
                            setSelectedItems(new Set());
                          }}
                        >
                          Clear
                        </Button>
                      </div>

                      <label className="block text-sm font-bold mb-2 text-green-900">
                        Step 2: Select Items to Return
                      </label>

                      <div className="space-y-2">
                        {searchedOrder.items.map((item: any, index: number) => (
                          <label
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedItems.has(index)
                                ? "border-orange-500 bg-orange-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedItems.has(index)}
                              onChange={() => toggleItemSelection(index)}
                              className="w-5 h-5 accent-orange-500"
                            />
                            <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-5">
                                <p className="font-semibold">{item.name}</p>
                              </div>
                              <div className="col-span-2 text-center">
                                <p className="text-sm text-gray-600">
                                  Qty: {item.quantity}
                                </p>
                              </div>
                              <div className="col-span-2 text-center">
                                <p className="text-sm text-gray-600">
                                  @ Rs. {item.price.toLocaleString()}
                                </p>
                              </div>
                              <div className="col-span-3 text-right">
                                <p className="font-bold text-green-700">
                                  Rs. {item.subtotal.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Selected total */}
                      {selectedItems.size > 0 && (
                        <div className="mt-4 pt-4 border-t border-green-300">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-900">
                              Selected {selectedItems.size} item(s) to return:
                            </span>
                            <span className="text-2xl font-black text-orange-700">
                              Rs. {selectedTotal.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-green-700 mt-1">
                            ✓ Stock will be automatically added back to
                            inventory
                          </p>
                        </div>
                      )}
                    </Card>

                    {/* Step 3: Return Details */}
                    <Card className="p-4 bg-gray-50">
                      <label className="block text-sm font-bold mb-3">
                        Step 3: Return Details
                      </label>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Reason *
                          </label>
                          <select
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="defective">Defective Product</option>
                            <option value="wrong_item">Wrong Item</option>
                            <option value="expired">Expired</option>
                            <option value="customer_request">
                              Customer Request
                            </option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Payment Method
                          </label>
                          <Input
                            value={
                              searchedOrder.paymentMethod?.toUpperCase() ||
                              "CASH"
                            }
                            disabled
                            className="bg-gray-200"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs font-medium mb-1">
                          Notes (Optional)
                        </label>
                        <Textarea
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                          rows={2}
                          placeholder="Additional notes about this return..."
                        />
                      </div>
                    </Card>

                    {/* Submit Button */}
                    <Button
                      onClick={handleEasyReturn}
                      disabled={actionLoading || selectedItems.size === 0}
                      className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg font-bold"
                    >
                      {actionLoading ? (
                        "Processing..."
                      ) : (
                        <>
                          ✓ Process Return & Restock ({selectedItems.size}{" "}
                          items, Rs. {selectedTotal.toLocaleString()})
                        </>
                      )}
                    </Button>
                  </>
                )}

                {!searchedOrder && !isSearching && (
                  <div className="text-center py-8 text-gray-400">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Enter an order number above to get started
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {refunds.filter((r) => r.status === "pending").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-60" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Online Refunds</p>
                <p className="text-2xl font-bold text-purple-600">
                  {refunds.filter((r) => r.returnType === "online").length}
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 text-purple-600 opacity-60" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">POS Returns</p>
                <p className="text-2xl font-bold text-orange-600">
                  {refunds.filter((r) => r.returnType === "pos_manual").length}
                </p>
              </div>
              <Package className="h-8 w-8 text-orange-600 opacity-60" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Refunded</p>
                <p className="text-2xl font-bold text-red-600">
                  Rs{" "}
                  {refunds
                    .filter(
                      (r) =>
                        r.status === "completed" || r.status === "approved",
                    )
                    .reduce((s, r) => s + (r.refundedAmount || 0), 0)
                    .toFixed(0)}
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="online">Online Orders</SelectItem>
                  <SelectItem value="pos_manual">POS Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <Input
                placeholder="Order number or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                      <h3 className="font-semibold text-lg">
                        {refund.order?.orderNumber ||
                          refund.orderNumber ||
                          "N/A"}
                      </h3>
                      <StatusBadge status={refund.status} />
                      <TypeBadge type={refund.returnType} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Requested</p>
                        <p className="font-semibold text-red-600">
                          Rs {fmt(refund.requestedAmount)}
                        </p>
                      </div>
                      {refund.refundedAmount ? (
                        <div>
                          <p className="text-gray-500">Refunded</p>
                          <p className="font-semibold text-green-600">
                            Rs {fmt(refund.refundedAmount)}
                          </p>
                        </div>
                      ) : null}
                      {refund.deliveryCost && refund.deliveryCost > 0 ? (
                        <div>
                          <p className="text-gray-500">Delivery Cost</p>
                          <p className="font-semibold text-orange-600">
                            - Rs {fmt(refund.deliveryCost)}
                          </p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-gray-500">Reason</p>
                        <p className="font-semibold capitalize">
                          {refund.reason.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-semibold">
                          {new Date(refund.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {/* Item summary pills */}
                    {refund.returnItems && refund.returnItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {refund.returnItems.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium"
                          >
                            {it.name} × {it.returnQty}
                            {it.restock && (
                              <span className="text-green-600 font-bold">
                                ↩
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedRefund(refund);
                      setShowDetail(true);
                      setApprovalAmount(
                        refund.returnType === "online"
                          ? String(refund.requestedAmount - 300)
                          : String(refund.requestedAmount),
                      );
                      setApprovalNotes("");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Eye size={16} className="mr-2" /> View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No refund requests found</p>
          </Card>
        )}

        {/* ── Detail Dialog ── */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Refund Request Details</DialogTitle>
            </DialogHeader>
            {selectedRefund && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-semibold">
                      {selectedRefund.order?.orderNumber ||
                        selectedRefund.orderNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <TypeBadge type={selectedRefund.returnType} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Requested Amount</p>
                    <p className="font-semibold text-red-600">
                      Rs {fmt(selectedRefund.requestedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <StatusBadge status={selectedRefund.status} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reason</p>
                    <p className="font-semibold capitalize">
                      {selectedRefund.reason.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">
                      {new Date(selectedRefund.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Item breakdown if available */}
                {selectedRefund.returnItems &&
                  selectedRefund.returnItems.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-2">
                        Returned Items:
                      </p>
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              {[
                                "Item",
                                "Qty",
                                "Unit Price",
                                "Line Total",
                                "Restocked",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {selectedRefund.returnItems.map((it, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium">
                                  {it.name}
                                </td>
                                <td className="px-3 py-2">{it.returnQty}</td>
                                <td className="px-3 py-2">
                                  Rs {fmt(it.unitPrice)}
                                </td>
                                <td className="px-3 py-2 font-bold text-green-700">
                                  Rs {fmt(it.lineTotal)}
                                </td>
                                <td className="px-3 py-2">
                                  {it.restock ? (
                                    <span className="text-green-600 font-semibold text-xs">
                                      ✓ Yes
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">
                                      No
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-orange-50 border-t">
                            <tr>
                              <td
                                colSpan={3}
                                className="px-3 py-2 text-right text-sm font-bold"
                              >
                                Total:
                              </td>
                              <td
                                colSpan={2}
                                className="px-3 py-2 text-base font-black text-orange-700"
                              >
                                Rs{" "}
                                {fmt(
                                  selectedRefund.returnItems.reduce(
                                    (s, i) => s + i.lineTotal,
                                    0,
                                  ),
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                {selectedRefund.returnType === "online" && (
                  <Card className="p-4 bg-orange-50 border-orange-200">
                    <p className="text-sm font-semibold text-orange-800">
                      ⚠️ Online Order: Rs 300 delivery cost will be deducted
                      from refund
                    </p>
                  </Card>
                )}

                {selectedRefund.status === "pending" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Approval Amount (Rs)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={approvalAmount}
                        onChange={(e) => setApprovalAmount(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedRefund.returnType === "online"
                          ? "Delivery cost (Rs 300) already deducted"
                          : "Full amount for POS return"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Notes
                      </label>
                      <Textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleApprove}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={actionLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {actionLoading ? "Processing..." : "Approve & Restock"}
                      </Button>
                      <Button
                        onClick={handleReject}
                        variant="outline"
                        className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                        disabled={actionLoading}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </>
                )}

                {selectedRefund.status !== "pending" && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold mb-2">
                      Processing Info:
                    </p>
                    {selectedRefund.refundedAmount ? (
                      <p className="text-sm">
                        Refunded: Rs {fmt(selectedRefund.refundedAmount)}
                      </p>
                    ) : null}
                    {selectedRefund.approvedBy ? (
                      <p className="text-sm">
                        Processed by: {selectedRefund.approvedBy.name}
                      </p>
                    ) : null}
                    {selectedRefund.notes ? (
                      <p className="text-sm mt-2">
                        Notes: {selectedRefund.notes}
                      </p>
                    ) : null}
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
