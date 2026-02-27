// app/api/admin/sale/bundles/[id]/route.ts
// ✅ FIXED: Added async params for Next.js 15

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

// ── PATCH — update a bundle ────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    if (!auth(req)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // ✅ FIXED: await params

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

    const update: any = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (image !== undefined) update.image = image;
    if (bundlePrice !== undefined) update.bundlePrice = bundlePrice;
    if (discount !== undefined) update.discount = discount;
    if (discountType !== undefined) update.discountType = discountType;
    if (gst !== undefined) update.gst = gst;
    if (isActive !== undefined) update.isActive = isActive;
    if (isFlashSale !== undefined) update.isFlashSale = isFlashSale;
    if (products !== undefined) {
      update.products = products.map((p: any) => ({
        product: p.productId,
        quantity: p.quantity || 1,
        unit: p.unit || "",
      }));
    }

    const bundle = await Bundle.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: false }
    )
      .populate("products.product", "name mainImage retailPrice unitSize unitType stock")
      .lean();

    if (!bundle) {
      return NextResponse.json({ message: "Bundle not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Bundle updated", bundle }, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/admin/sale/bundles/[id]:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── DELETE — remove a bundle ───────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    if (!auth(req)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // ✅ FIXED: await params

    const bundle = await Bundle.findByIdAndDelete(id);
    if (!bundle) {
      return NextResponse.json({ message: "Bundle not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Bundle deleted" }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/admin/sale/bundles/[id]:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}