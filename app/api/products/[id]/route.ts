// FILE PATH: app/api/products/[id]/route.ts

import { connectDB } from "@/lib/db";
import { Product, Category, InventoryBatch } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { deleteFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";
import mongoose from "mongoose";

function isValidMongoId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function extractPublicId(url: string): string | null {
  try {
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    return `${folder}/${filename.split(".")[0]}`;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!id || id.trim() === "") {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    if (!isValidMongoId(id)) {
      return NextResponse.json({ message: "Invalid product ID format" }, { status: 400 });
    }

    const url = new URL(request.url);
    const isAdminRequest = url.searchParams.get("admin") === "true";

    const product = await Product.findById(id)
      .populate("category", "name slug icon")
      .lean();

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    if (!isAdminRequest) {
      if (product.status !== "active") {
        return NextResponse.json(
          { message: "Product not available", reason: "inactive" },
          { status: 404 }
        );
      }
      if (!product.onlineVisible) {
        return NextResponse.json(
          { message: "Product not available", reason: "not_listed_online" },
          { status: 404 }
        );
      }
    }

    // ── FIFO Batch Pricing (same logic as the listing route) ─────────────────
    const batches = await InventoryBatch.find({
      product:           product._id,
      remainingQuantity: { $gt: 0 },
      status:            { $in: ["active", "partial"] },
    })
      .sort({ createdAt: 1 }) // oldest first = FIFO
      .lean();

    const fifoBatches = batches.map((b) => ({
      _id:               String(b._id),
      remainingQuantity: b.remainingQuantity,
      sellingPrice:      b.sellingPrice,
      buyingRate:        b.buyingRate,
    }));

    const currentBatch = fifoBatches[0] ?? null;

    const productWithFIFO = {
      ...product,
      // Override retailPrice with the active batch's selling price
      retailPrice: currentBatch ? currentBatch.sellingPrice : product.retailPrice,
      fifoBatches,
    };
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ product: productWithFIFO }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/products/[id]] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// ── PUT and DELETE remain unchanged ───────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(request.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden - admin only" }, { status: 403 });

    const { id } = await params;

    if (!isValidMongoId(id))
      return NextResponse.json({ message: "Invalid product ID format" }, { status: 400 });

    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

    const formData = await request.formData();

    const name         = (formData.get("name") as string)?.trim();
    const sku          = (formData.get("sku") as string)?.trim();
    const description  = (formData.get("description") as string)?.trim() || "";
    const retailPrice  = Number(formData.get("retailPrice") || product.retailPrice);
    const discount     = Number(formData.get("discount") || 0);
    const discountType = (formData.get("discountType") as "percentage" | "fixed") || "percentage";
    const category     = (formData.get("category") as string)?.trim();
    const unitType     = (formData.get("unitType") as string)?.trim();
    const unitSize     = Number(formData.get("unitSize") || product.unitSize);
    const gst          = Number(formData.get("gst") || 17);
    const stock        = Number(formData.get("stock") ?? product.stock);
    const status       = (formData.get("status") as "active" | "draft" | "discontinued") || "active";
    const isFlashSale  = formData.get("isFlashSale") === "true";
    const isHot        = formData.get("isHot") === "true";
    const isFeatured   = formData.get("isFeatured") === "true";
    const onlineVisible = formData.get("onlineVisible") === "true";
    const imageFile    = formData.get("image") as File | null;

    const errors: string[] = [];
    if (!name) errors.push("Product name is required");
    if (!sku) errors.push("SKU is required");
    if (!unitType) errors.push("Unit type is required");
    if (retailPrice < 0) errors.push("Retail price cannot be negative");
    if (discount < 0) errors.push("Discount cannot be negative");
    if (gst < 0 || gst > 100) errors.push("GST must be between 0 and 100");
    if (stock < 0) errors.push("Stock cannot be negative");

    if (errors.length > 0)
      return NextResponse.json({ message: "Validation failed", errors }, { status: 400 });

    if (sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku, _id: { $ne: id } });
      if (existingProduct)
        return NextResponse.json({ message: "SKU already exists for another product" }, { status: 400 });
    }

    if (category && !mongoose.Types.ObjectId.isValid(category))
      return NextResponse.json({ message: "Invalid category ID format" }, { status: 400 });

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists)
        return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }

    let imageUrl = product.mainImage;

    if (imageFile && imageFile.size > 0) {
      try {
        const uploadRes: any = await uploadToCloudinary(imageFile, "products");
        imageUrl = uploadRes.secure_url;
        if (product.mainImage) {
          const publicId = extractPublicId(product.mainImage);
          if (publicId) await deleteFromCloudinary(publicId);
        }
      } catch (err) {
        console.error("[PUT] Image upload error:", err);
        return NextResponse.json({ message: "Failed to upload image" }, { status: 500 });
      }
    }

    product.name        = name;
    product.sku         = sku;
    product.description = description;
    product.retailPrice = retailPrice;
    product.discount    = discount;
    product.discountType = discountType;
    product.category    = category || product.category;
    product.unitType    = unitType;
    product.unitSize    = unitSize;
    product.gst         = gst;
    product.stock       = stock;
    product.status      = status;
    product.isNewArrival = isFlashSale;
    product.isHot       = isHot;
    product.isFeatured  = isFeatured;
    product.onlineVisible = onlineVisible;
    product.mainImage   = imageUrl;

    await product.save();

    const updatedProduct = await Product.findById(id)
      .populate("category", "name slug icon")
      .lean();

    return NextResponse.json(
      { message: "Product updated successfully", product: updatedProduct },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PUT /api/products/[id]] Error:", error);
    return NextResponse.json({ message: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(request.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden - admin only" }, { status: 403 });

    const { id } = await params;

    if (!isValidMongoId(id))
      return NextResponse.json({ message: "Invalid product ID format" }, { status: 400 });

    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

    if (product.mainImage) {
      const publicId = extractPublicId(product.mainImage);
      if (publicId) await deleteFromCloudinary(publicId);
    }

    await Product.findByIdAndDelete(id);

    return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/products/[id]] Error:", error);
    return NextResponse.json({ message: "Failed to delete product" }, { status: 500 });
  }
}