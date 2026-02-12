import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// PUBLIC GET: fetch visible categories (no auth)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Only fetch visible categories for the public
    const categories = await Category.find({ isVisible: true }).sort({
      sortOrder: 1,
      name: 1,
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// PROTECTED CREATE category
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { name, icon } = await req.json();
    if (!name)
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );

    // Check if category exists
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existing)
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 },
      );

    const category = new Category({ name, icon: icon || "" });
    await category.save();

    return NextResponse.json(
      { message: "Category created", category },
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
