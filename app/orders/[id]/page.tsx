"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Download,
  RotateCcw,
  Package,
  Truck,
  CheckCircle,
  Star,
  Loader2,
  AlertCircle,
  Banknote,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AuthProvider } from "@/components/auth/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  _id?: string;
  product: {
    _id: string;
    name: string;
    mainImage?: string;
    images?: string[];
  } | null;
  name: string;
  image?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  // Bundle fields (set when this line came from a bundle)
  bundleId?: string | null;
  bundleName?: string | null;
  isBundle?: boolean;
}

interface OrderDetail {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  shippingAddress: {
    fullName?: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
    country?: string;
  };
  subtotal: number;
  gstAmount: number;
  shippingCost?: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  isPOS: boolean;
  createdAt: string;
  trackingNumber?: string;
  trackingProvider?: string;
  trackingURL?: string;
  shippedDate?: string;
  deliveredDate?: string;
}

// ── Bundle grouping helper ────────────────────────────────────────────────────

interface BundleGroup {
  bundleId: string;
  bundleName: string;
  items: OrderItem[];
  groupTotal: number;
}

/**
 * Splits order items into:
 *  - `bundles`  — groups of items that share a bundleId
 *  - `regular`  — standalone product lines
 */
function groupItems(items: OrderItem[]): {
  bundles: BundleGroup[];
  regular: OrderItem[];
} {
  const bundleMap = new Map<string, BundleGroup>();
  const regular: OrderItem[] = [];

  for (const item of items) {
    if (item.bundleId) {
      if (!bundleMap.has(item.bundleId)) {
        bundleMap.set(item.bundleId, {
          bundleId:   item.bundleId,
          bundleName: item.bundleName || "Bundle",
          items:      [],
          groupTotal: 0,
        });
      }
      const group = bundleMap.get(item.bundleId)!;
      group.items.push(item);
      group.groupTotal += item.subtotal ?? item.price * item.quantity;
    } else {
      regular.push(item);
    }
  }

  return { bundles: Array.from(bundleMap.values()), regular };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ItemImage({ item }: { item: OrderItem }) {
  const src =
    item.image ||
    item.product?.mainImage ||
    item.product?.images?.[0] ||
    "/placeholder.svg";

  return (
    <div className="relative w-16 h-16 overflow-hidden bg-gray-100 border border-gray-200 rounded-lg shrink-0">
      <Image src={src} alt={item.name} fill className="object-cover" unoptimized />
    </div>
  );
}

function RegularItemRow({
  item,
  canReview,
  onReview,
}: {
  item: OrderItem;
  canReview: boolean;
  onReview: (id: string, name: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
      <ItemImage item={item} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{item.name}</p>
        <p className="text-sm text-gray-500">
          Qty: {item.quantity} × Rs. {item.price.toLocaleString()}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-gray-900 whitespace-nowrap">
          Rs. {(item.subtotal ?? item.price * item.quantity).toLocaleString()}
        </p>
        {canReview && item.product?._id && (
          <Button
            onClick={() => onReview(item.product!._id, item.name)}
            size="sm"
            className="gap-1 mt-2 text-xs bg-green-700 rounded-lg hover:bg-green-800 print:hidden"
          >
            <Star className="w-3 h-3" /> Review
          </Button>
        )}
      </div>
    </div>
  );
}

function BundleGroupCard({
  group,
  canReview,
  onReview,
}: {
  group: BundleGroup;
  canReview: boolean;
  onReview: (id: string, name: string) => void;
}) {
  return (
    <div className="overflow-hidden border-2 border-green-100 rounded-xl">
      {/* Bundle header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-green-100 bg-green-50">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-green-700" />
          <span className="text-sm font-bold text-green-800">{group.bundleName}</span>
          <span className="text-[10px] font-black bg-green-200 text-green-800 px-2 py-0.5 rounded-full uppercase">
            Bundle
          </span>
        </div>
        <span className="text-sm font-bold text-green-700 whitespace-nowrap">
          Rs. {group.groupTotal.toLocaleString()}
        </span>
      </div>

      {/* Bundle line items */}
      <div className="bg-white divide-y divide-gray-100">
        {group.items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <ItemImage item={item} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{item.name}</p>
              <p className="text-xs text-gray-500">
                Qty: {item.quantity} × Rs. {item.price.toLocaleString()}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                Rs. {(item.subtotal ?? item.price * item.quantity).toLocaleString()}
              </p>
              {canReview && item.product?._id && (
                <Button
                  onClick={() => onReview(item.product!._id, item.name)}
                  size="sm"
                  className="mt-1.5 bg-green-700 hover:bg-green-800 rounded-lg gap-1 text-xs print:hidden"
                >
                  <Star className="w-3 h-3" /> Review
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const params  = useParams();
  const orderId = params.id as string;

  const [order,      setOrder]      = useState<OrderDetail | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);

  // Refund dialog
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason,     setRefundReason]     = useState("defective");
  const [refundNotes,      setRefundNotes]      = useState("");
  const [isSubmitting,     setIsSubmitting]     = useState(false);

  // Review dialog
  const [showReviewDialog,  setShowReviewDialog]  = useState(false);
  const [reviewingProduct,  setReviewingProduct]  = useState<{ id: string; name: string } | null>(null);
  const [reviewForm,        setReviewForm]        = useState({ rating: 5, comment: "" });
  const [reviewLoading,     setReviewLoading]     = useState(false);
  const [reviewError,       setReviewError]       = useState("");
  const [reviewSuccess,     setReviewSuccess]     = useState("");

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error("Failed to fetch order");
        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [orderId]);

  const handleRefundRequest = async () => {
    if (!order) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/refunds/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orderId: order._id, reason: `${refundReason}: ${refundNotes}` }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Refund request submitted!\n\nWe'll review it within 24 hours.\nNote:  delivery charges will be deducted.");
        setShowRefundDialog(false);
        setRefundReason("defective");
        setRefundNotes("");
      } else {
        alert(`❌ ${data.error || "Failed to submit refund request"}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error submitting refund request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewDialog = (productId: string, productName: string) => {
    setReviewingProduct({ id: productId, name: productName });
    setReviewForm({ rating: 5, comment: "" });
    setReviewError("");
    setReviewSuccess("");
    setShowReviewDialog(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingProduct) return;
    setReviewError("");
    setReviewSuccess("");
    if (!reviewForm.comment.trim()) { setReviewError("Please write a review comment"); return; }
    setReviewLoading(true);
    try {
      const res = await fetch("/api/products/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ productId: reviewingProduct.id, rating: reviewForm.rating, comment: reviewForm.comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");
      setReviewSuccess(data.message || "Review submitted! It will appear after admin approval.");
      setTimeout(() => setShowReviewDialog(false), 2000);
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onClick?: (r: number) => void) => (
    <div className="flex justify-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={interactive ? 32 : 20}
          className={`${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={() => interactive && onClick?.(i + 1)}
        />
      ))}
    </div>
  );

  const canRequestRefund = () => {
    if (!order) return false;
    if (order.isPOS) return false;
    if (order.orderStatus === "cancelled") return false;
    return order.orderStatus === "delivered" || order.orderStatus === "shipped";
  };

  const canReview = order?.orderStatus === "delivered";
  const isCOD     = order?.paymentMethod === "cod";

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "shipped":   return <Truck         className="w-5 h-5" />;
      case "delivered": return <CheckCircle   className="w-5 h-5" />;
      default:          return <Package       className="w-5 h-5" />;
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading) return (
    <AuthProvider>
      <div className="min-h-screen"><Navbar />
        <main className="p-6 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-green-700 animate-spin" />
          <p>Loading order details…</p>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );

  if (!order) return (
    <AuthProvider>
      <div className="min-h-screen"><Navbar />
        <main className="p-6 text-center text-red-600">Order not found</main>
        <Footer />
      </div>
    </AuthProvider>
  );

  // ── Group items ───────────────────────────────────────────────────────────
  const { bundles, regular } = groupItems(order.items);
  const hasBundles  = bundles.length  > 0;
  const hasRegular  = regular.length  > 0;

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">

          <Button variant="outline" asChild className="mb-4 rounded-xl print:hidden">
            <Link href="/orders">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
            </Link>
          </Button>

          {/* ── Order header ── */}
          <Card className="p-6 mb-6 bg-white border-0 shadow-md">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
                <p className="mt-1 text-gray-600">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                {order.shippingAddress?.fullName && (
                  <p className="mt-1 text-sm text-gray-500">For: {order.shippingAddress.fullName}</p>
                )}
              </div>
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold self-start md:self-auto ${
                order.orderStatus === "delivered"  ? "bg-green-100 text-green-800"  :
                order.orderStatus === "shipped"    ? "bg-blue-100  text-blue-800"   :
                order.orderStatus === "pending"    ? "bg-yellow-100 text-yellow-800" :
                order.orderStatus === "cancelled"  ? "bg-red-100   text-red-800"    :
                "bg-gray-100 text-gray-800"
              }`}>
                {getStatusIcon(order.orderStatus)}
                {order.orderStatus.toUpperCase()}
              </span>
            </div>
          </Card>

          {/* ── Refund banner ── */}
          {canRequestRefund() && (
            <Card className="p-4 mb-6 border border-orange-200 bg-orange-50 print:hidden">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-orange-900">Not satisfied with your order?</p>
                  <p className="text-sm text-orange-700">Request a refund and we'll process it within 24 hours</p>
                </div>
                <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-600 hover:bg-orange-700 rounded-xl whitespace-nowrap">
                      <RotateCcw className="w-4 h-4 mr-2" /> Request Refund
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Request Refund</DialogTitle>
                      <DialogDescription>Provide details about why you want to return this order</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium">Reason for Return *</label>
                        <Select value={refundReason} onValueChange={setRefundReason}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="defective">Defective Product</SelectItem>
                            <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                            <SelectItem value="not_as_described">Not As Described</SelectItem>
                            <SelectItem value="damaged">Damaged During Shipping</SelectItem>
                            <SelectItem value="expired">Expired Product</SelectItem>
                            <SelectItem value="changed_mind">Changed My Mind</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium">Additional Details *</label>
                        <Textarea
                          value={refundNotes}
                          onChange={(e) => setRefundNotes(e.target.value)}
                          placeholder="Please describe your return request…"
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                      <Card className="p-3 border border-blue-200 bg-blue-50">
                        <p className="text-xs font-semibold text-blue-800">Refund Policy:</p>
                        <ul className="mt-2 space-y-1 text-xs text-blue-700 list-disc list-inside">
                          <li>delivery charges will be deducted</li>
                          <li>Refund processed within 24–48 hours</li>
                          <li>Product must be returned in original condition</li>
                        </ul>
                      </Card>
                      <div className="flex gap-3">
                        <Button onClick={handleRefundRequest} disabled={isSubmitting || !refundNotes.trim()} className="flex-1 bg-orange-600 hover:bg-orange-700 rounded-xl">
                          {isSubmitting ? "Submitting…" : "Submit Request"}
                        </Button>
                        <Button onClick={() => setShowRefundDialog(false)} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          )}

          {/* ── Order items ── */}
          <Card className="p-6 mb-6 bg-white border-0 shadow-md">
            <h2 className="mb-4 text-lg font-bold">Order Items</h2>

            <div className="space-y-4">
              {/* Bundle groups */}
              {hasBundles && bundles.map((group) => (
                <BundleGroupCard
                  key={group.bundleId}
                  group={group}
                  canReview={!!canReview}
                  onReview={openReviewDialog}
                />
              ))}

              {/* Divider when both bundles and regular items exist */}
              {hasBundles && hasRegular && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Individual Items</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              {/* Regular items */}
              {hasRegular && regular.map((item, i) => (
                <RegularItemRow
                  key={i}
                  item={item}
                  canReview={!!canReview}
                  onReview={openReviewDialog}
                />
              ))}

              {/* Fallback: nothing to show (shouldn't happen) */}
              {!hasBundles && !hasRegular && (
                <p className="py-8 text-center text-gray-400">No items found in this order.</p>
              )}
            </div>
          </Card>

          {/* ── Tracking info ── */}
          {order.trackingNumber && (
            <Card className="p-6 mb-6 border border-0 border-blue-200 shadow-md bg-blue-50">
              <h2 className="flex items-center gap-2 mb-4 text-lg font-bold">
                <Truck className="w-5 h-5" /> Tracking Information
              </h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-gray-600">Tracking Number: </span><span className="font-semibold">{order.trackingNumber}</span></p>
                {order.trackingProvider && <p><span className="font-medium text-gray-600">Provider: </span><span className="font-semibold">{order.trackingProvider}</span></p>}
                {order.shippedDate   && <p><span className="font-medium text-gray-600">Shipped On: </span><span className="font-semibold">{new Date(order.shippedDate).toLocaleDateString()}</span></p>}
                {order.deliveredDate && <p><span className="font-medium text-gray-600">Delivered On: </span><span className="font-semibold">{new Date(order.deliveredDate).toLocaleDateString()}</span></p>}
                {order.trackingURL && (
                  <Button asChild className="w-full mt-3 bg-blue-600 hover:bg-blue-700 rounded-xl print:hidden">
                    <Link href={order.trackingURL} target="_blank"><Truck className="w-4 h-4 mr-2" />Track Package</Link>
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* ── Shipping address ── */}
          <Card className="p-6 mb-6 bg-white border-0 shadow-md">
            <h2 className="mb-4 text-lg font-bold">Shipping Address</h2>
            <div className="space-y-1 text-sm text-gray-700">
              {order.shippingAddress?.fullName && <p className="font-semibold">{order.shippingAddress.fullName}</p>}
              {order.shippingAddress?.phone    && <p>{order.shippingAddress.phone}</p>}
              {order.shippingAddress?.street   && <p>{order.shippingAddress.street}</p>}
              {order.shippingAddress?.city     && <p>{order.shippingAddress.city}{order.shippingAddress.province ? `, ${order.shippingAddress.province}` : ""}</p>}
              {order.shippingAddress?.zipCode  && <p>{order.shippingAddress.zipCode}</p>}
              {order.shippingAddress?.country  && <p>{order.shippingAddress.country}</p>}
            </div>
          </Card>

          {/* ── Order summary ── */}
          <Card className="p-6 mb-6 bg-white border-0 shadow-md">
            <h2 className="mb-4 text-lg font-bold">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between font-medium text-gray-700">
                <span>Subtotal</span>
                <span>Rs. {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700">
                <span>Tax</span>
                <span>Rs. {order.gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700">
                <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> Shipping</span>
                {(order.shippingCost ?? 0) === 0
                  ? <span className="font-bold text-green-600">Free</span>
                  : <span>Rs. {(order.shippingCost ?? 0).toFixed(2)}</span>}
              </div>

              {isCOD && (
                <div className="flex justify-between px-2 py-2 -mx-2 font-medium text-orange-600 rounded-lg bg-orange-50">
                  <span className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Payment Method</span>
                  <span className="font-bold">Cash on Delivery</span>
                </div>
              )}

              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-lg font-black text-gray-900">Total</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-green-700">Rs. {order.total.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-black mt-1">
                    {isCOD ? "PAY ON DELIVERY" : "PKR"}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => window.print()}
              className="w-full mt-6 bg-green-700 hover:bg-green-800 rounded-xl print:hidden"
            >
              <Download className="w-4 h-4 mr-2" /> Download Invoice
            </Button>
          </Card>

          {/* ── Review dialog ── */}
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Review: {reviewingProduct?.name || "Product"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitReview} className="mt-2 space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Your Rating</label>
                  {renderStars(reviewForm.rating, true, (r) => setReviewForm({ ...reviewForm, rating: r }))}
                  <p className="mt-2 text-xs text-center text-gray-400">
                    {["", "Very Poor", "Poor", "Average", "Good", "Excellent"][reviewForm.rating]}
                  </p>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-semibold text-gray-700">Your Review</label>
                  <Textarea
                    placeholder="Share your experience with this product…"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    className="resize-none"
                    rows={4}
                    required
                  />
                </div>
                {reviewError && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 border border-red-100 bg-red-50 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {reviewError}
                  </div>
                )}
                {reviewSuccess && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-green-600 border border-green-100 bg-green-50 rounded-xl">
                    <CheckCircle className="w-4 h-4 shrink-0" /> {reviewSuccess}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={reviewLoading} className="flex-1 bg-green-700 hover:bg-green-800 rounded-xl">
                    {reviewLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : "Submit Review"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowReviewDialog(false)} className="flex-1 rounded-xl" disabled={reviewLoading}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </main>
        <Footer />
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          main, main * { visibility: visible; }
          main { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </AuthProvider>
  );
}