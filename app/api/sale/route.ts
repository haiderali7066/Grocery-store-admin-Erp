// app/api/sale/route.ts
// Public: returns the flash sale configuration for the store page

import { connectDB } from "@/lib/db";
import { SaleConfig } from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    const sale = await SaleConfig.findOne().lean();

    return NextResponse.json(
      {
        sale: sale ?? {
          isActive: false,
          title: "Flash Sale",
          subtitle: "",
          badgeText: "Flash Sale",
          endsAt: null,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET /api/sale error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
