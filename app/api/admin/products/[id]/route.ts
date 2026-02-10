import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import { deleteFromCloudinary } from "@/lib/cloudinary";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }, // dynamic route param
) {
  try {
    await connectDB();

    // Auth
    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Await the route param
    const { id } = await context.params;
    console.log("Attempting to delete product with ID:", id);

    // Find product to check if it exists and get image info
    const product = await Product.findById(id);
    if (!product) {
      console.log("Product not found in database");
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.log("Product found:", product.name);

    // Delete image from Cloudinary if exists
    if (product.mainImage) {
      try {
        const urlParts = product.mainImage.split("/");
        const uploadIndex = urlParts.indexOf("upload");
        if (uploadIndex !== -1 && uploadIndex + 1 < urlParts.length) {
          const pathAfterUpload = urlParts.slice(uploadIndex + 1).join("/");
          const publicId = pathAfterUpload.substring(
            0,
            pathAfterUpload.lastIndexOf("."),
          );

          console.log("Deleting image from Cloudinary:", publicId);
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        // Continue deletion even if image deletion fails
      }
    }

    // Delete product from DB
    await Product.findByIdAndDelete(id);
    console.log("Product deleted successfully");

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Product deletion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete product",
      },
      { status: 500 },
    );
  }
}
