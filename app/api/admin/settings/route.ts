import { connectDB } from "@/lib/db";
import { StoreSettings } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    let settings = await StoreSettings.findOne().lean();

    // Create default settings if none exist
    if (!settings) {
      settings = await StoreSettings.create({});
    }

    return NextResponse.json({ settings }, { status: 200 });
  } catch (err) {
    console.error("Settings fetch error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = await StoreSettings.create(data);
    } else {
      await StoreSettings.findByIdAndUpdate(settings._id, data, { new: true });
    }

    return NextResponse.json(
      { message: "Settings updated successfully", settings },
      { status: 200 },
    );
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
