// app/api/admin/customers/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

function requireStaff(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  const payload = verifyToken(token);
  if (!payload || !["admin", "manager", "accountant", "staff"].includes(payload.role)) return null;
  return payload;
}

function requireAdmin(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    // Only admin can edit customers
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const { name, email, phone, addresses } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        name,
        email: email.toLowerCase(),
        phone: phone || "",
        addresses: addresses || [],
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH customer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    // Only admin can delete customers
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Customer deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE customer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}