"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, Eye, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RefundRequest {
  _id: string;
  order: { _id: string; orderNumber: string; total: number };
  requestedAmount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "refunded";
  approvedBy?: { name: string };
  approvedAt?: string;
  refundedAmount?: number;
  notes?: string;
  createdAt: string;
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Fetch refund requests
  useEffect(() => {
    const fetchRefunds = async () => {
      try {
        const res = await fetch("/api/admin/refunds");
        const data = await res.json();
        // Ensure we always set arrays
        setRefunds(Array.isArray(data) ? data : []);
        setFilteredRefunds(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("[Refunds] Error fetching:", error);
        setRefunds([]);
        setFilteredRefunds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRefunds();
  }, []);

  // Filter refunds
  useEffect(() => {
    if (!Array.isArray(refunds)) return setFilteredRefunds([]);

    let filtered = [...refunds];

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.order?.orderNumber
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          r.reason?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredRefunds(filtered);
  }, [refunds, statusFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      approved: { bg: "bg-blue-100", text: "text-blue-800", icon: CheckCircle },
      rejected: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
      refunded: {
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

  // Approve / Reject / Manual Return functions remain same, no changes needed

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Loading refund requests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header, Filters, Manual Return Dialog... (same as your original code) */}

        {/* Refund Requests List */}
        {Array.isArray(filteredRefunds) && filteredRefunds.length > 0 ? (
          <div className="space-y-4">
            {filteredRefunds.map((refund) => (
              <Card key={refund._id} className="p-4 hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {refund.order.orderNumber}
                      </h3>
                      {getStatusBadge(refund.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Requested</p>
                        <p className="font-semibold text-red-600">
                          Rs {refund.requestedAmount}
                        </p>
                      </div>
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
                      {refund.refundedAmount && (
                        <div>
                          <p className="text-gray-600">Refunded</p>
                          <p className="font-semibold text-green-600">
                            Rs {refund.refundedAmount}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedRefund(refund);
                      setShowDetail(true);
                      setApprovalAmount(refund.requestedAmount.toString());
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
      </div>
    </div>
  );
}
