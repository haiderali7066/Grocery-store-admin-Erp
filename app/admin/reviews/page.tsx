'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Check, X, Star } from 'lucide-react';

interface Review {
  _id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/admin/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('[v0] Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Filter reviews
  useEffect(() => {
    let filtered = reviews;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((r) =>
        filterStatus === 'approved' ? r.isApproved : !r.isApproved
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.comment.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReviews(filtered);
  }, [reviews, filterStatus, searchTerm]);

  const handleApprove = async (reviewId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setReviews(
          reviews.map((r) =>
            r._id === reviewId ? { ...r, isApproved: true } : r
          )
        );
      }
    } catch (error) {
      console.error('[v0] Error approving review:', error);
      alert('Failed to approve review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reviewId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setReviews(reviews.filter((r) => r._id !== reviewId));
      }
    } catch (error) {
      console.error('[v0] Error rejecting review:', error);
      alert('Failed to reject review');
    } finally {
      setActionLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={16}
            className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Reviews</h1>
        <p className="text-gray-600">Manage customer product reviews</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="Search reviews, products, or customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Reviews</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
        </select>
        <div className="text-right flex items-center justify-end">
          <span className="text-sm text-gray-600">{filteredReviews.length} reviews</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-0">
          <p className="text-sm text-gray-600">Total Reviews</p>
          <p className="text-3xl font-bold mt-2">{reviews.length}</p>
        </Card>
        <Card className="p-6 border-0">
          <p className="text-sm text-gray-600">Pending Approval</p>
          <p className="text-3xl font-bold mt-2 text-yellow-600">
            {reviews.filter((r) => !r.isApproved).length}
          </p>
        </Card>
        <Card className="p-6 border-0">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-3xl font-bold mt-2 text-green-600">
            {reviews.filter((r) => r.isApproved).length}
          </p>
        </Card>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Loading reviews...</p>
      ) : filteredReviews.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No reviews found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card key={review._id} className="p-6 border-0">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{review.productName}</h3>
                    <p className="text-sm text-gray-600">
                      by {review.userName}
                    </p>
                  </div>
                  <div className="text-right">
                    {renderStars(review.rating)}
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Comment */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800">{review.comment}</p>
                </div>

                {/* Status and Actions */}
                <div className="flex justify-between items-center">
                  <div>
                    {review.isApproved ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        <Check size={16} />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!review.isApproved && (
                      <Button
                        onClick={() => handleApprove(review._id)}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full"
                        size="sm"
                      >
                        <Check size={16} className="mr-1" />
                        Approve
                      </Button>
                    )}
                    <Button
                      onClick={() => handleReject(review._id)}
                      disabled={actionLoading}
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50 rounded-full bg-transparent"
                      size="sm"
                    >
                      <Trash2 size={16} className="mr-1" />
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
