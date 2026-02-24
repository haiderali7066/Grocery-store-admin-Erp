// app/api/admin/customers/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyToken(token);

    if (!payload || !["admin", "manager", "staff"].includes(payload.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || "";

    if (!search || search.length < 2) {
      return NextResponse.json({ customers: [] }, { status: 200 });
    }

    const customers = await User.find({
      role: "user",
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    })
      .select("name email phone")
      .limit(10)
      .lean();

    return NextResponse.json({ customers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
