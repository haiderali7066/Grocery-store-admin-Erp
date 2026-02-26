// ══════════════════════════════════════════════════════════════════════════════
// app/api/admin/products/route.ts  —  GET + POST
// ══════════════════════════════════════════════════════════════════════════════
// import { connectDB } from "@/lib/db";
// import { Product, Category } from "@/lib/models/index";
// import { NextRequest, NextResponse } from "next/server";
// import { verifyToken, getTokenFromCookie } from "@/lib/auth";
// import { uploadToCloudinary } from "@/lib/cloudinary";

import { connectDB } from "@/lib/db";
import { Product, Category } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const products = await Product.find().populate("category").sort({ createdAt: -1 });
    return NextResponse.json({ products, total: products.length }, { status: 200 });
  } catch (error) {
    console.error("[Admin Products GET]", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const formData = await req.formData();

    const name          = formData.get("name")          as string;
    const category      = formData.get("category")      as string;
    const unitType      = (formData.get("unitType") as string)?.trim();
    const discount      = formData.get("discount")      as string;
    const discountType  = formData.get("discountType")  as string;
    const isFlashSale   = formData.get("isFlashSale")   === "true";
    const isHot         = formData.get("isHot")         === "true";
    const isFeatured    = formData.get("isFeatured")    === "true";
    const onlineVisible = formData.get("onlineVisible") === "true";
    const image         = formData.get("image")         as File | null;
    const description   = formData.get("description")   as string | null;
    const skuInput      = formData.get("sku")           as string | null;

    if (!unitType)
      return NextResponse.json({ error: "Unit type is required" }, { status: 400 });

    const categoryDoc = await Category.findById(category);
    if (!categoryDoc)
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });

    let imageUrl = "";
    if (image && image.size > 0) {
      try {
        const result: any = await uploadToCloudinary(image, "products");
        imageUrl = result.secure_url;
      } catch {
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
      }
    }

    const sku = skuInput?.trim() || `${name.substring(0, 3).toUpperCase()}-${Date.now()}`;

    const product = new Product({
      name,
      sku,
      description,
      retailPrice: 0,
      discount: discount ? parseFloat(discount) : 0,
      discountType: discountType || "percentage",
      category: categoryDoc._id,
      unitType,        // free-text, stored as-is
      unitSize: 0,     // no longer collected from form
      mainImage: imageUrl,
      stock: 0,
      status: "active",
      onlineVisible,
      posVisible: true,
      isFeatured,
      isHot,
      isNewArrival: isFlashSale,
    });

    await product.save();
    return NextResponse.json({ message: "Product created", product }, { status: 201 });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}

