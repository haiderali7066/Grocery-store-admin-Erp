// FILE PATH: app/api/products/[id]/route.ts
// ✅ COMPLETE: GET, PUT, DELETE with proper validation
// ✅ GET supports public (with visibility checks) and admin (no visibility checks) modes

import { connectDB } from "@/lib/db";
import { Product, Category } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { deleteFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";
import mongoose from "mongoose";

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── GET: Fetch Single Product ──────────────────────────────────────────────
// ✅ Supports both public store view and admin/validation access
// Query params:
//   ?admin=true - Bypass visibility checks (for CartValidator, admin panel)
//   (default) - Apply visibility checks (for store frontend)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // ✅ Validate ID format
    if (!id || id.trim() === "") {
      return NextResponse.json(
        { message: "ID is required" },
        { status: 400 }
      );
    }

    if (!isValidMongoId(id)) {
      return NextResponse.json(
        { message: "Invalid product ID format" },
        { status: 400 }
      );
    }

    // ✅ Check if this is an admin/system request (CartValidator, admin panel)
    const url = new URL(request.url);
    const isAdminRequest = url.searchParams.get("admin") === "true";

    // ✅ Fetch product
    const product = await Product.findById(id).populate(
      "category",
      "name slug icon"
    ).lean();

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    // ✅ Apply visibility checks for public requests
    // Admin requests (CartValidator, admin panel) bypass these checks
    if (!isAdminRequest) {
      // Public store view - enforce visibility rules
      if (product.status !== "active") {
        return NextResponse.json(
          {
            message: "Product not available",
            reason: "inactive",
          },
          { status: 404 }
        );
      }

      if (!product.onlineVisible) {
        return NextResponse.json(
          {
            message: "Product not available",
            reason: "not_listed_online",
          },
          { status: 404 }
        );
      }

      // Note: We don't block out-of-stock products anymore
      // This allows users to see "out of stock" instead of "not found"
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/products/[id]] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PUT: Update Product ────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // ✅ Auth check
    const token = getTokenFromCookie(request.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { message: "Forbidden - admin only" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ✅ Validate ID format
    if (!isValidMongoId(id)) {
      return NextResponse.json(
        { message: "Invalid product ID format" },
        { status: 400 }
      );
    }

    // ✅ Find existing product
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();

    // ✅ Extract and validate fields
    const name = (formData.get("name") as string)?.trim();
    const sku = (formData.get("sku") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || "";
    const retailPrice = Number(formData.get("retailPrice") || product.retailPrice);
    const discount = Number(formData.get("discount") || 0);
    const discountType = (formData.get("discountType") as "percentage" | "fixed") || "percentage";
    const category = (formData.get("category") as string)?.trim();
    const unitType = (formData.get("unitType") as string)?.trim();
    const unitSize = Number(formData.get("unitSize") || product.unitSize);
    const gst = Number(formData.get("gst") || 17);
    const stock = Number(formData.get("stock") ?? product.stock);
    const status = (formData.get("status") as "active" | "draft" | "discontinued") || "active";
    const isFlashSale = formData.get("isFlashSale") === "true";
    const isHot = formData.get("isHot") === "true";
    const isFeatured = formData.get("isFeatured") === "true";
    const onlineVisible = formData.get("onlineVisible") === "true";
    const imageFile = formData.get("image") as File | null;

    // ✅ Validation
    const errors: string[] = [];

    if (!name) errors.push("Product name is required");
    if (!sku) errors.push("SKU is required");
    if (!unitType) errors.push("Unit type is required");
    if (retailPrice < 0) errors.push("Retail price cannot be negative");
    if (discount < 0) errors.push("Discount cannot be negative");
    if (gst < 0 || gst > 100) errors.push("GST must be between 0 and 100");
    if (stock < 0) errors.push("Stock cannot be negative");

    if (errors.length > 0) {
      return NextResponse.json(
        { message: "Validation failed", errors },
        { status: 400 }
      );
    }

    // ✅ Check SKU uniqueness (allow same SKU if it's the same product)
    if (sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku, _id: { $ne: id } });
      if (existingProduct) {
        return NextResponse.json(
          { message: "SKU already exists for another product" },
          { status: 400 }
        );
      }
    }

    // ✅ Validate category exists if provided
    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return NextResponse.json(
        { message: "Invalid category ID format" },
        { status: 400 }
      );
    }

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return NextResponse.json(
          { message: "Category not found" },
          { status: 404 }
        );
      }
    }

    // ✅ Handle image upload
    let imageUrl = product.mainImage;

    if (imageFile && imageFile.size > 0) {
      try {
        const uploadRes: any = await uploadToCloudinary(imageFile, "products");
        imageUrl = uploadRes.secure_url;

        // ✅ Delete old image from Cloudinary
        if (product.mainImage) {
          try {
            const publicId = extractPublicId(product.mainImage);
            if (publicId) {
              await deleteFromCloudinary(publicId);
            }
          } catch (err) {
            console.warn("[PUT] Old image delete failed:", err);
          }
        }
      } catch (err) {
        console.error("[PUT] Image upload error:", err);
        return NextResponse.json(
          { message: "Failed to upload image" },
          { status: 500 }
        );
      }
    }

    // ✅ Update product
    product.name = name;
    product.sku = sku;
    product.description = description;
    product.retailPrice = retailPrice;
    product.discount = discount;
    product.discountType = discountType;
    product.category = category || product.category;
    product.unitType = unitType;
    product.unitSize = unitSize;
    product.gst = gst;
    product.stock = stock;
    product.status = status;
    product.isNewArrival = isFlashSale;
    product.isHot = isHot;
    product.isFeatured = isFeatured;
    product.onlineVisible = onlineVisible;
    product.mainImage = imageUrl;

    await product.save();

    // ✅ Return updated product
    const updatedProduct = await Product.findById(id)
      .populate("category", "name slug icon")
      .lean();

    return NextResponse.json(
      {
        message: "Product updated successfully",
        product: updatedProduct,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PUT /api/products/[id]] Error:", error);
    return NextResponse.json(
      { message: "Failed to update product" },
      { status: 500 }
    );
  }
}

// ── DELETE: Delete Product ─────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // ✅ Auth check
    const token = getTokenFromCookie(request.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { message: "Forbidden - admin only" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // ✅ Validate ID format
    if (!isValidMongoId(id)) {
      return NextResponse.json(
        { message: "Invalid product ID format" },
        { status: 400 }
      );
    }

    // ✅ Find product
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    // ✅ Delete image from Cloudinary if exists
    if (product.mainImage) {
      try {
        const publicId = extractPublicId(product.mainImage);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (err) {
        console.warn("[DELETE] Image deletion failed:", err);
        // Don't block product deletion if image removal fails
      }
    }

    // ✅ Delete product from database
    await Product.findByIdAndDelete(id);

    // ⚠️ NOTE: Deleting a product will cause CartValidator to detect it as orphaned
    // This is correct behavior - products in carts that are deleted should be flagged

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DELETE /api/products/[id]] Error:", error);
    return NextResponse.json(
      { message: "Failed to delete product" },
      { status: 500 }
    );
  }
}