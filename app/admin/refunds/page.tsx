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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  createdAt: string;
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(
    null,
  );
  const [showDetail, setShowDetail] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalAmount, setApprovalAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showManualReturn, setShowManualReturn] = useState(false);
  const [manualReturnForm, setManualReturnForm] = useState({
    orderNumber: "",
    amount: "",
    reason: "defective",
    notes: "",
  });

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const res = await fetch("/api/admin/refunds");

      // Check if response is ok
      if (!res.ok) {
        console.error("Failed to fetch refunds:", res.status, res.statusText);
        setRefunds([]);
        setFilteredRefunds([]);
        return;
      }

      // Check content type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON:", contentType);
        setRefunds([]);
        setFilteredRefunds([]);
        return;
      }

      const data = await res.json();
      setRefunds(Array.isArray(data) ? data : []);
      setFilteredRefunds(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching refunds:", error);
      setRefunds([]);
      setFilteredRefunds([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!Array.isArray(refunds)) return setFilteredRefunds([]);

    let filtered = [...refunds];

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.returnType === typeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((r) => {
        const orderNum = r.order?.orderNumber || r.orderNumber || "";
        return (
          orderNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.reason?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredRefunds(filtered);
  }, [refunds, statusFilter, typeFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      approved: { bg: "bg-blue-100", text: "text-blue-800", icon: CheckCircle },
      rejected: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
      completed: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: CheckCircle,
      },
    };
    const badge = badges[status] || badges["pending"];
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}
      >
        <badge.icon size={14} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
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
  };

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
        alert("Refund approved successfully!");
        setShowDetail(false);
        fetchRefunds();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to approve"}`);
      }
    } catch (error) {
      console.error("Approve error:", error);
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
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to reject"}`);
      }
    } catch (error) {
      console.error("Reject error:", error);
      alert("Error rejecting refund");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualReturn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualReturnForm.orderNumber || !manualReturnForm.amount) {
      alert("Please fill required fields");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/refunds/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: manualReturnForm.orderNumber,
          amount: parseFloat(manualReturnForm.amount),
          reason: manualReturnForm.reason,
          notes: manualReturnForm.notes,
        }),
      });

      if (res.ok) {
        alert("Manual return created successfully!");
        setShowManualReturn(false);
        setManualReturnForm({
          orderNumber: "",
          amount: "",
          reason: "defective",
          notes: "",
        });
        fetchRefunds();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to create manual return"}`);
      }
    } catch (error) {
      console.error("Manual return error:", error);
      alert("Error creating manual return");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Loading refund requests...</p>
      </div>
    );
  }

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
          <Dialog open={showManualReturn} onOpenChange={setShowManualReturn}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                POS Manual Return
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Manual POS Return</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleManualReturn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sale/Order Number *
                  </label>
                  <Input
                    value={manualReturnForm.orderNumber}
                    onChange={(e) =>
                      setManualReturnForm({
                        ...manualReturnForm,
                        orderNumber: e.target.value,
                      })
                    }
                    placeholder="SALE-000123 or ORD-123"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Return Amount (Rs) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualReturnForm.amount}
                    onChange={(e) =>
                      setManualReturnForm({
                        ...manualReturnForm,
                        amount: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reason *
                  </label>
                  <select
                    value={manualReturnForm.reason}
                    onChange={(e) =>
                      setManualReturnForm({
                        ...manualReturnForm,
                        reason: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="defective">Defective Product</option>
                    <option value="wrong_item">Wrong Item</option>
                    <option value="expired">Expired</option>
                    <option value="customer_request">Customer Request</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <Textarea
                    value={manualReturnForm.notes}
                    onChange={(e) =>
                      setManualReturnForm({
                        ...manualReturnForm,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Creating..." : "Create Manual Return"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
                    .reduce((sum, r) => sum + (r.refundedAmount || 0), 0)
                    .toFixed(0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600 opacity-60" />
            </div>
          </Card>
        </div>

        {/* Refund Requests List */}
        {Array.isArray(filteredRefunds) && filteredRefunds.length > 0 ? (
          <div className="space-y-4">
            {filteredRefunds.map((refund) => (
              <Card key={refund._id} className="p-4 hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {refund.order?.orderNumber ||
                          refund.orderNumber ||
                          "N/A"}
                      </h3>
                      {getStatusBadge(refund.status)}
                      {getTypeBadge(refund.returnType)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Requested</p>
                        <p className="font-semibold text-red-600">
                          Rs {refund.requestedAmount.toFixed(2)}
                        </p>
                      </div>
                      {refund.refundedAmount && (
                        <div>
                          <p className="text-gray-600">Refunded</p>
                          <p className="font-semibold text-green-600">
                            Rs {refund.refundedAmount.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {refund.deliveryCost && refund.deliveryCost > 0 && (
                        <div>
                          <p className="text-gray-600">Delivery Cost</p>
                          <p className="font-semibold text-orange-600">
                            - Rs {refund.deliveryCost.toFixed(2)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Reason</p>
                        <p className="font-semibold">{refund.reason}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Date</p>
                        <p className="font-semibold">
                          {new Date(refund.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedRefund(refund);
                      setShowDetail(true);
                      setApprovalAmount(
                        refund.returnType === "online"
                          ? (refund.requestedAmount - 300).toString()
                          : refund.requestedAmount.toString(),
                      );
                      setApprovalNotes("");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Eye size={16} className="mr-2" />
                    View
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

        {/* Detail Dialog */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-2xl">
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
                    {getTypeBadge(selectedRefund.returnType)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Requested Amount</p>
                    <p className="font-semibold text-red-600">
                      Rs {selectedRefund.requestedAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    {getStatusBadge(selectedRefund.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reason</p>
                    <p className="font-semibold">{selectedRefund.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">
                      {new Date(selectedRefund.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

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
                    {selectedRefund.refundedAmount && (
                      <p className="text-sm">
                        Refunded: Rs {selectedRefund.refundedAmount.toFixed(2)}
                      </p>
                    )}
                    {selectedRefund.approvedBy && (
                      <p className="text-sm">
                        Processed by: {selectedRefund.approvedBy.name}
                      </p>
                    )}
                    {selectedRefund.notes && (
                      <p className="text-sm mt-2">
                        Notes: {selectedRefund.notes}
                      </p>
                    )}
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
