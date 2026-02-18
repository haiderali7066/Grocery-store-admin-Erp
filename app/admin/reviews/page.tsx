"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Trash2,
  Check,
  Star,
  Loader2,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Review {
  _id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
}

type ToastType = "success" | "error" | null;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({
    type: null,
    message: "",
  });

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: "" }), 3500);
  };

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      } else {
        showToast("error", "Failed to load reviews");
      }
    } catch {
      showToast("error", "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Filter logic
  useEffect(() => {
    let filtered = reviews;

    if (filterStatus !== "all") {
      filtered = filtered.filter((r) =>
        filterStatus === "approved" ? r.isApproved : !r.isApproved,
      );
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.productName.toLowerCase().includes(lower) ||
          r.userName.toLowerCase().includes(lower) ||
          r.comment.toLowerCase().includes(lower),
      );
    }

    setFilteredReviews(filtered);
  }, [reviews, filterStatus, searchTerm]);

  const handleApprove = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/approve`, {
        method: "PATCH",
      });
      if (res.ok) {
        setReviews(
          reviews.map((r) =>
            r._id === reviewId ? { ...r, isApproved: true } : r,
          ),
        );
        showToast("success", "Review approved");
      } else {
        const d = await res.json();
        showToast("error", d.error || "Failed to approve");
      }
    } catch {
      showToast("error", "Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Delete this review? This action cannot be undone.")) return;
    setActionLoading(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReviews(reviews.filter((r) => r._id !== reviewId));
        showToast("success", "Review deleted");
      } else {
        const d = await res.json();
        showToast("error", d.error || "Failed to delete");
      }
    } catch {
      showToast("error", "Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }
        />
      ))}
    </div>
  );

  const pendingCount = reviews.filter((r) => !r.isApproved).length;
  const approvedCount = reviews.filter((r) => r.isApproved).length;

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast.type && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Product Reviews</h1>
        <p className="text-gray-500 text-sm mt-1">
          Moderate and manage customer reviews
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-0 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
            Total Reviews
          </p>
          <p className="text-3xl font-black text-gray-900">{reviews.length}</p>
        </Card>
        <Card className="p-6 border-0 shadow-sm bg-yellow-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
            Pending Approval
          </p>
          <p className="text-3xl font-black text-yellow-600">{pendingCount}</p>
        </Card>
        <Card className="p-6 border-0 shadow-sm bg-green-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
            Approved
          </p>
          <p className="text-3xl font-black text-green-600">{approvedCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search reviews, products, or customers…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="all">All Reviews ({reviews.length})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="approved">Approved ({approvedCount})</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card className="p-12 text-center border-0 bg-gray-50">
          <p className="text-gray-400">
            {searchTerm || filterStatus !== "all"
              ? "No reviews match your filters"
              : "No reviews yet"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => (
            <Card key={review._id} className="p-5 border-0 shadow-sm">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {review.productName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="font-medium">{review.userName}</span>
                      {review.userEmail && (
                        <>
                          <span>·</span>
                          <span className="text-xs">{review.userEmail}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {renderStars(review.rating)}
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center justify-between">
                  {review.isApproved ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                      <Check size={14} /> Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                      Pending Approval
                    </span>
                  )}

                  <div className="flex gap-2">
                    {!review.isApproved && (
                      <Button
                        onClick={() => handleApprove(review._id)}
                        disabled={actionLoading === review._id}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl gap-1"
                        size="sm"
                      >
                        {actionLoading === review._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Approve
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(review._id)}
                      disabled={actionLoading === review._id}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl gap-1"
                      size="sm"
                    >
                      {actionLoading === review._id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
