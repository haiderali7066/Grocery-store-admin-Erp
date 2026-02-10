import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getTokenFromCookie, hashPassword } from "@/lib/auth";

const ALLOWED_STAFF_ROLES = ["admin", "manager", "accountant", "staff"];

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const { id } = await context.params; // ✅ FIXED

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyAuth(token);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { name, email, phone, role, password } = await req.json();

    if (role && !ALLOWED_STAFF_ROLES.includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    const updateData: any = { name, email, phone, role };

    if (password) {
      updateData.password = await hashPassword(password);
    }

    const staff = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!staff) {
      return NextResponse.json({ message: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Updated", staff }, { status: 200 });
  } catch (error) {
    console.error("[Staff PUT] Error:", error);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const { id } = await context.params; // ✅ FIXED

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyAuth(token);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const staff = await User.findByIdAndDelete(id);

    if (!staff) {
      return NextResponse.json({ message: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    console.error("[Staff DELETE] Error:", error);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
