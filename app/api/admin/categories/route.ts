import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// GET all categories (admin)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const categories = await Category.find()
      .select("_id name icon isVisible sortOrder")
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// CREATE category
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { name, icon, isVisible = true } = await req.json();

    if (!name || name.trim() === "")
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );

    // Check if category exists (case-insensitive)
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing)
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 },
      );

    // Get the highest sortOrder and increment
    const highestSort = await Category.findOne()
      .sort({ sortOrder: -1 })
      .select("sortOrder");
    const nextSortOrder = highestSort ? highestSort.sortOrder + 1 : 0;

    // Create category with icon
    const category = new Category({
      name: name.trim(),
      icon: icon?.trim() || "",
      isVisible,
      sortOrder: nextSortOrder,
    });

    await category.save();

    return NextResponse.json(
      { message: "Category created successfully", category },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
