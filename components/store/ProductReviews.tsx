"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Star, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Review {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export function ProductReviews({
  productId,
  productName,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [formData, setFormData] = useState({ rating: 5, comment: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(
        `/api/products/${productId}/reviews?approved=true`,
      );
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.comment.trim()) {
      setError("Please write a review comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/products/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating: formData.rating,
          comment: formData.comment.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setSuccess(data.message || "Review submitted!");
      setFormData({ rating: 5, comment: "" });
      setTimeout(() => {
        setShowReviewForm(false);
        setSuccess("");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : "0";

  const renderStars = (
    rating: number,
    interactive = false,
    onClick?: (r: number) => void,
  ) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={interactive ? 24 : 16}
            className={`${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={() => interactive && onClick?.(i + 1)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>

        {/* Rating Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-5xl font-black text-gray-900">
                {averageRating}
              </div>
              <div className="flex gap-1 mt-2 justify-center">
                {renderStars(Math.round(parseFloat(averageRating)))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
            <DialogTrigger asChild>
              <Button className="bg-green-700 hover:bg-green-800 rounded-xl">
                Write a Review
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle>Review: {productName}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitReview} className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Rating
                  </label>
                  <div className="flex justify-center">
                    {renderStars(formData.rating, true, (r) =>
                      setFormData({ ...formData, rating: r }),
                    )}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-1">
                    {formData.rating === 5
                      ? "Excellent"
                      : formData.rating === 4
                        ? "Good"
                        : formData.rating === 3
                          ? "Average"
                          : formData.rating === 2
                            ? "Poor"
                            : "Very Poor"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Your Review
                  </label>
                  <textarea
                    placeholder="Share your experience with this product…"
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData({ ...formData, comment: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={4}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-xl text-sm">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    {success}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-green-700 hover:bg-green-800 rounded-xl"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting…
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReviewForm(false)}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : reviews.length === 0 ? (
          <Card className="p-12 text-center border-0 bg-gray-50">
            <p className="text-gray-400 text-sm">
              No reviews yet. Be the first to review this product!
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review._id} className="p-5 border-0 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {review.userName}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString("en-PK", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {review.comment}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
