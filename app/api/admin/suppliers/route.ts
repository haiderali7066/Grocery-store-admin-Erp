import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const suppliers = await Supplier.find({ isActive: true }).sort({
      name: 1,
    });

    return NextResponse.json({ suppliers }, { status: 200 });
  } catch (error) {
    console.error("Suppliers fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email, phone, address, city, contact } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 },
      );
    }

    const supplier = new Supplier({
      name,
      email,
      phone,
      address,
      city,
      contact,
      balance: 0,
      isActive: true,
    });

    await supplier.save();

    return NextResponse.json(
      { message: "Supplier created successfully", supplier },
      { status: 201 },
    );
  } catch (error) {
    console.error("Supplier creation error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 },
    );
  }
}
