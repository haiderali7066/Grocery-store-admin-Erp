import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { deleteFromCloudinary, uploadToCloudinary } from "@/lib/cloudinary";

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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const formData = await req.formData();

    const product = await Product.findById(id);
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const name          = formData.get("name")          as string;
    const sku           = formData.get("sku")           as string;
    const description   = formData.get("description")   as string;
    const discount      = Number(formData.get("discount") || 0);
    const discountType  = formData.get("discountType")  as "percentage" | "fixed";
    const category      = formData.get("category")      as string;
    const unitType      = (formData.get("unitType") as string)?.trim();
    const isFlashSale   = formData.get("isFlashSale")   === "true";
    const isHot         = formData.get("isHot")         === "true";
    const isFeatured    = formData.get("isFeatured")    === "true";
    const onlineVisible = formData.get("onlineVisible") === "true";
    const imageFile     = formData.get("image")         as File | null;

    if (!unitType)
      return NextResponse.json({ error: "Unit type is required" }, { status: 400 });

    let imageUrl = product.mainImage;

    if (imageFile && imageFile.size > 0) {
      try {
        const uploadRes: any = await uploadToCloudinary(imageFile, "products");
        imageUrl = uploadRes.secure_url;

        if (product.mainImage) {
          try {
            const publicId = extractPublicId(product.mainImage);
            if (publicId) await deleteFromCloudinary(publicId);
          } catch (err) {
            console.error("Old image delete error:", err);
          }
        }
      } catch (err) {
        console.error("Image upload error:", err);
        return NextResponse.json({ error: "Failed to upload new image" }, { status: 500 });
      }
    }

    product.name         = name;
    product.sku          = sku;
    product.description  = description;
    product.discount     = discount;
    product.discountType = discountType;
    product.category     = category;
    product.unitType     = unitType;   // free-text, no enum
    product.isNewArrival = isFlashSale;
    product.isHot        = isHot;
    product.isFeatured   = isFeatured;
    product.onlineVisible = onlineVisible;
    product.mainImage    = imageUrl;

    await product.save();

    return NextResponse.json({ message: "Product updated successfully", product }, { status: 200 });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}