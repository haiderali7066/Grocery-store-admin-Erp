import { connectDB } from "@/lib/db";
import { Product, Category } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Parse FormData
    const formData = await req.formData();
    const name = formData.get("name") as string;
    // REMOVED basePrice extraction
    const category = formData.get("category") as string;
    const weight = formData.get("weight") as string;
    const weightUnit = formData.get("weightUnit") as string;
    const discount = formData.get("discount") as string;
    const discountType = formData.get("discountType") as string;
    const isFlashSale = formData.get("isFlashSale") === "true";
    const isHot = formData.get("isHot") === "true";
    const isFeatured = formData.get("isFeatured") === "true";
    const image = formData.get("image") as File | null;

    // New fields
    const description = formData.get("description") as string | null;
    const skuInput = formData.get("sku") as string | null;

    // Validate category
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return NextResponse.json(
        { error: "Invalid category selected" },
        { status: 400 },
      );
    }

    // Handle image upload
    let imageUrl = "";
    if (image) {
      try {
        const uploadResult: any = await uploadToCloudinary(image, "products");
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        console.error("Image upload error:", error);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 },
        );
      }
    }

    // Use provided SKU or generate one
    const sku =
      skuInput?.trim() || `${name.substring(0, 3).toUpperCase()}-${Date.now()}`;

    const product = new Product({
      name,
      sku,
      description,
      retailPrice: 0, // Defaulted to 0 since input was removed
      discount: discount ? parseFloat(discount) : 0,
      discountType: discountType || "percentage",
      category: categoryDoc._id,
      unitType: weightUnit,
      unitSize: parseFloat(weight),
      mainImage: imageUrl,
      stock: 0,
      status: "active",
      onlineVisible: true,
      posVisible: true,
      isFeatured: isFeatured || false,
      isHot: isHot || false,
      isNewArrival: isFlashSale || false,
    });

    await product.save();

    return NextResponse.json(
      { message: "Product created successfully", product },
      { status: 201 },
    );
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
