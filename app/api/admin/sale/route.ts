// app/api/admin/sale/route.ts

import { connectDB } from "@/lib/db";
import { SaleConfig, Product } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

// ── GET /api/admin/sale ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Fetch or create sale config
    let sale = await SaleConfig.findOne().lean();
    if (!sale) {
      sale = await SaleConfig.create({
        isActive: false,
        title: "Flash Sale",
        subtitle: "Unbeatable deals for a limited time only",
        badgeText: "Flash Sale",
        endsAt: null,
      });
    }

    // Fetch ALL products — admin needs to see everything to tag/untag
    const products = await Product.find()
      .select(
        "name retailPrice discount discountType mainImage unitSize unitType stock isNewArrival status",
      )
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ sale, products }, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/sale error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── POST /api/admin/sale ───────────────────────────────────────────────────────
// Save sale config (title, subtitle, badgeText, endsAt, isActive)

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { isActive, title, subtitle, badgeText, endsAt } = await req.json();

    if (isActive) {
      if (!endsAt)
        return NextResponse.json(
          { message: "A sale end date/time is required to activate the sale" },
          { status: 400 },
        );
      if (new Date(endsAt).getTime() <= Date.now())
        return NextResponse.json(
          { message: "Sale end time must be in the future" },
          { status: 400 },
        );
    }

    const update = {
      isActive: isActive ?? false,
      title: title?.trim() || "Flash Sale",
      subtitle: subtitle?.trim() || "",
      badgeText: badgeText?.trim() || "Flash Sale",
      endsAt: endsAt ? new Date(endsAt) : null,
    };

    let sale = await SaleConfig.findOne();
    if (!sale) {
      sale = await SaleConfig.create(update);
    } else {
      sale = await SaleConfig.findByIdAndUpdate(
        sale._id,
        { $set: update },
        { new: true },
      );
    }

    return NextResponse.json(
      { message: "Sale settings saved", sale },
      { status: 200 },
    );
  } catch (err) {
    console.error("POST /api/admin/sale error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── PATCH /api/admin/sale ──────────────────────────────────────────────────────
// Toggle a product in/out of the flash sale by flipping isNewArrival.
// Body: { productId: string, isNewArrival: boolean }

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { productId, isNewArrival } = await req.json();

    if (!productId)
      return NextResponse.json(
        { message: "productId is required" },
        { status: 400 },
      );

    const product = await Product.findByIdAndUpdate(
      productId,
      { $set: { isNewArrival: !!isNewArrival } },
      { new: true, runValidators: false },
    ).lean();

    if (!product)
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );

    return NextResponse.json(
      { message: "Product updated", product },
      { status: 200 },
    );
  } catch (err) {
    console.error("PATCH /api/admin/sale error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
