import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { deleteFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";

// ========================================
// DELETE PRODUCT
// ========================================
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete image from Cloudinary
    if (product.mainImage) {
      try {
        const publicId = extractPublicId(product.mainImage);
        if (publicId) await deleteFromCloudinary(publicId);
      } catch (err) {
        console.error("Cloudinary delete error:", err);
      }
    }

    await Product.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}

// ========================================
// UPDATE PRODUCT
// ========================================
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const formData = await req.formData();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Extract fields
    const name = formData.get("name") as string;
    const sku = formData.get("sku") as string;
    const description = formData.get("description") as string;
    const basePrice = Number(formData.get("basePrice"));
    const discount = Number(formData.get("discount") || 0);
    const discountType = formData.get("discountType") as "percentage" | "fixed";
    const category = formData.get("category") as string;
    const weight = Number(formData.get("weight"));
    const weightUnit = formData.get("weightUnit") as string;
    const isFlashSale = formData.get("isFlashSale") === "true";
    const isHot = formData.get("isHot") === "true";
    const isFeatured = formData.get("isFeatured") === "true";

    const imageFile = formData.get("image") as File | null;

    let imageUrl = product.mainImage;

    // =============================
    // If new image uploaded
    // =============================
    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadRes: any = await uploadToCloudinary(buffer);
      imageUrl = uploadRes.secure_url;

      // delete old image
      if (product.mainImage) {
        try {
          const publicId = extractPublicId(product.mainImage);
          if (publicId) await deleteFromCloudinary(publicId);
        } catch (err) {
          console.error("Old image delete error:", err);
        }
      }
    }

    // =============================
    // Update product fields
    // =============================
    product.name = name;
    product.sku = sku;
    product.description = description;
    product.retailPrice = basePrice;
    product.discount = discount;
    product.discountType = discountType;
    product.category = category;
    product.weight = weight;
    product.weightUnit = weightUnit;
    product.isNewArrival = isFlashSale;
    product.isHot = isHot;
    product.isFeatured = isFeatured;
    product.mainImage = imageUrl;

    await product.save();

    return NextResponse.json(
      {
        message: "Product updated successfully",
        product,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

// ========================================
// HELPER: Extract Cloudinary Public ID
// ========================================
function extractPublicId(url: string) {
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;

    const path = parts[1];
    return path.substring(0, path.lastIndexOf("."));
  } catch {
    return null;
  }
}
