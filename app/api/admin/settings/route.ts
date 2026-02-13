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

    // Auth check
    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Strip internal Mongoose/Next fields that should not be written back
    const { _id, __v, createdAt, updatedAt, ...safeData } = data as any;

    // Sanitise heroBanners — strip any _id added by Mongoose on subdocs
    if (Array.isArray(safeData.heroBanners)) {
      safeData.heroBanners = safeData.heroBanners.map(
        ({ _id: _bid, ...rest }: any) => rest,
      );
    }

    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = await StoreSettings.create(safeData);
    } else {
      settings = await StoreSettings.findByIdAndUpdate(
        settings._id,
        { $set: safeData },
        { new: true, runValidators: false },
      );
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
