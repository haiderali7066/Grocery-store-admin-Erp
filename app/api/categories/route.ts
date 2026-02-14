import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models";

// PUBLIC GET — returns all visible categories with icons
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const categories = await Category.find({ isVisible: true })
      .select("_id name icon isVisible sortOrder")
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Ensure icon field exists in response
    const categoriesWithIcons = categories.map((cat) => ({
      ...cat,
      icon: cat.icon || "", // Ensure icon is always a string
    }));

    return NextResponse.json(
      {
        categories: categoriesWithIcons,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
