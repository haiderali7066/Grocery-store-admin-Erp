import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { id } = params;
    const { name, icon, isVisible, sortOrder } = await req.json();

    const category = await Category.findById(id);
    if (!category)
      return NextResponse.json({ error: "Category not found" }, { status: 404 });

    // Update fields
    if (name) category.name = name;
    if (icon !== undefined) category.icon = icon;
    if (isVisible !== undefined) category.isVisible = isVisible;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;

    await category.save();

    return NextResponse.json({ message: "Category updated", category }, { status: 200 });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { id } = params;

    const category = await Category.findByIdAndDelete(id);
    if (!category)
      return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ message: "Category deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
