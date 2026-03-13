// FILE PATH: app/api/admin/suppliers/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  return verifyToken(token);
}

const ALLOWED = ["admin", "manager", "accountant", "staff"];

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const payload = auth(req);
    if (!payload || !ALLOWED.includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Include inactive suppliers too so history is never hidden
    const suppliers = await Supplier.find().sort({ name: 1 }).lean();

    return NextResponse.json({ suppliers }, { status: 200 });
  } catch (error) {
    console.error("[Suppliers GET]", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const payload = auth(req);
    if (!payload || !["admin", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, email, phone, address, city, contact } = await req.json();

    if (!name?.trim())
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });

    const supplier = await Supplier.create({
      name: name.trim(), email, phone, address, city, contact,
      balance: 0, isActive: true,
    });

    return NextResponse.json({ message: "Supplier created successfully", supplier }, { status: 201 });
  } catch (error) {
    console.error("[Suppliers POST]", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}