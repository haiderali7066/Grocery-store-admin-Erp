import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// PUBLIC GET — returns only visible categories, sorted
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const categories = await Category.find({ isVisible: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean(); // lean() returns plain JS objects — faster, less memory

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// PROTECTED POST — admin only
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") ?? "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const name: string | undefined = body?.name?.trim();
    const icon: string = body?.icon?.trim() ?? "";

    if (!name)
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );

    // Case-insensitive duplicate check
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existing)
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }, // 409 Conflict is more semantically correct than 400
      );

    const category = await Category.create({ name, icon });

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
