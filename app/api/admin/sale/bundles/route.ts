// app/api/admin/sale/bundles/route.ts
// ✅ POST: Create new bundle
// ✅ GET: Fetch all bundles (admin)

import { connectDB } from "@/lib/db";
import { Bundle } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// ── GET /api/admin/sale/bundles ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    if (!auth(req)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const bundles = await Bundle.find()
      .populate("products.product", "name mainImage retailPrice unitSize unitType stock")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ bundles }, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/sale/bundles error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── POST /api/admin/sale/bundles ───────────────────────────────────────────
// Create a new bundle

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    if (!auth(req)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      products,
      bundlePrice,
      discount,
      discountType,
      gst,
      isActive,
      isFlashSale,
      image,
    } = body;

    if (!name || !products || products.length === 0) {
      return NextResponse.json(
        { message: "Bundle name and at least one product are required" },
        { status: 400 }
      );
    }

    if (!bundlePrice || bundlePrice <= 0) {
      return NextResponse.json(
        { message: "Valid bundle price is required" },
        { status: 400 }
      );
    }

    const bundleData = {
      name: name.trim(),
      description: description?.trim() || "",
      image: image || null,
      products: products.map((p: any) => ({
        product: p.productId,
        quantity: p.quantity || 1,
        unit: p.unit || "",
      })),
      bundlePrice: parseFloat(bundlePrice),
      discount: parseFloat(discount) || 0,
      discountType: discountType || "percentage",
      gst: gst || 17,
      isActive: isActive ?? true,
      isFlashSale: isFlashSale ?? false,
    };

    const bundle = await Bundle.create(bundleData);
    const populated = await bundle.populate(
      "products.product",
      "name mainImage retailPrice unitSize unitType stock"
    );

    return NextResponse.json(
      { message: "Bundle created", bundle: populated },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/admin/sale/bundles error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}