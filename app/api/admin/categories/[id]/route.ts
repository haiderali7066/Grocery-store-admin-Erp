import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category, Product } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// DELETE - Delete a category
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const { id } = params;

    // Check if any products use this category
    const productsUsingCategory = await Product.countDocuments({
      category: id,
    });

    if (productsUsingCategory > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category. ${productsUsingCategory} products are using this category.`,
        },
        { status: 400 },
      );
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Category deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}

// PUT - Update a category
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const { id } = params;
    const body = await req.json();
    const { name, isVisible, sortOrder } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Category updated successfully",
        category,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}
