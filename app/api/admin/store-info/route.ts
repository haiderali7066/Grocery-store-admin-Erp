// FILE PATH: app/api/admin/store-info/route.ts

import { connectDB } from "@/lib/db";
import { StoreInfo } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/admin/store-info
// ✅ All authenticated users can VIEW store info
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const payload = verifyToken(getTokenFromCookie(req.headers.get("cookie") || ""));
    if (!payload)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    let storeInfo = await StoreInfo.findOne().lean();
    if (!storeInfo) {
      // Default store info if none exists
      storeInfo = {
        name: "Khas pure foods",
        address: "123 Store Street, Lahore, Pakistan",
        phone: "0300-1234567",
        email: "info@khasspurefoods.com",
      };
    }

    return NextResponse.json({ storeInfo }, { status: 200 });
  } catch (err: any) {
    console.error("GET store info error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH  /api/admin/store-info
// ✅ UPDATED: admin, manager, AND staff can now edit store info
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const payload = verifyToken(getTokenFromCookie(req.headers.get("cookie") || ""));
    // ✅ UPDATED: admin, manager, AND staff can all update store info
    if (!payload || !["admin", "manager", "staff"].includes(payload.role))
      return NextResponse.json(
        { error: "You don't have permission to edit store information. Admin, manager, and staff can update store info." },
        { status: 403 }
      );

    const { name, address, phone, email } = await req.json();

    // Validation
    if (!name?.trim() || !address?.trim() || !phone?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    let storeInfo = await StoreInfo.findOne();
    if (!storeInfo) {
      storeInfo = new StoreInfo({ name, address, phone, email });
    } else {
      storeInfo.name = name;
      storeInfo.address = address;
      storeInfo.phone = phone;
      storeInfo.email = email;
    }

    await storeInfo.save();

    return NextResponse.json(
      {
        message: "Store information updated successfully",
        storeInfo: {
          name: storeInfo.name,
          address: storeInfo.address,
          phone: storeInfo.phone,
          email: storeInfo.email,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PATCH store info error:", err);
    return NextResponse.json({ message: err.message || "Server error" }, { status: 500 });
  }
}