// app/api/admin/store-info/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StoreInfo } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let storeInfo = await StoreInfo.findOne().lean();
    
    // Return default if not found
    if (!storeInfo) {
      storeInfo = {
        name: "Khas pure foods",
        address: "123 Store Street, Lahore, Pakistan",
        phone: "0300-1234567",
        email: "info@khasspurefoods.com",
      };
    }

    return NextResponse.json({ storeInfo }, { status: 200 });
  } catch (error: any) {
    console.error("Store info fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, address, phone, email } = await req.json();

    if (!name || !address || !phone || !email) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Find and update, or create if doesn't exist
    let storeInfo = await StoreInfo.findOneAndUpdate(
      {},
      { name, address, phone, email },
      { new: true, upsert: true }
    );

    return NextResponse.json(
      { message: "Store info updated", storeInfo },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Store info update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}