// app/api/admin/sale/bundles/route.ts
import { connectDB } from "@/lib/db";
import { Bundle, Product } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// GET — list all bundles with product details
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    if (!auth(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const bundles = await Bundle.find()
      .populate("products.product", "name mainImage retailPrice unitSize unitType stock")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ bundles }, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/sale/bundles:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST — create a new bundle
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    if (!auth(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, products, bundlePrice, discount, discountType, gst, isActive, isFlashSale, image } = body;

    if (!name?.trim()) return NextResponse.json({ message: "Bundle name is required" }, { status: 400 });
    if (!Array.isArray(products) || products.length === 0)
      return NextResponse.json({ message: "At least one product is required" }, { status: 400 });
    if (!bundlePrice || bundlePrice <= 0)
      return NextResponse.json({ message: "Valid bundle price is required" }, { status: 400 });

    const bundle = await Bundle.create({
      name: name.trim(),
      description: description?.trim() || "",
      image: image || "",
      products: products.map((p: any) => ({
        product: p.productId,
        quantity: p.quantity || 1,
        unit: p.unit || "",
      })),
      bundlePrice,
      discount: discount || 0,
      discountType: discountType || "percentage",
      gst: gst ?? 0,
      isActive: isActive !== false,
      isFlashSale: isFlashSale === true,
    });

    const populated = await Bundle.findById(bundle._id)
      .populate("products.product", "name mainImage retailPrice unitSize unitType stock")
      .lean();

    return NextResponse.json({ message: "Bundle created", bundle: populated }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/sale/bundles:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}