import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getTokenFromCookie, hashPassword } from "@/lib/auth";

const ALLOWED_ROLES = ["admin", "manager", "accountant", "staff"];

/* =========================
   GET: Fetch Staff
========================= */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyAuth(token);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const staff = await User.find({ role: { $in: ALLOWED_ROLES } })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ staff }, { status: 200 });
  } catch (error) {
    console.error("[Staff GET] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* =========================
   POST: Create Staff
========================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyAuth(token);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, role, password } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: "Name, email, role and password are required" },
        { status: 400 },
      );
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    // ✅ Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // ✅ PRE-CHECK to avoid Mongo duplicate error
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);

    const newStaff = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      password: hashedPassword,
      role,
      isActive: true,
    });

    return NextResponse.json(
      {
        message: "Staff member created successfully",
        staff: {
          _id: newStaff._id,
          name: newStaff.name,
          email: newStaff.email,
          phone: newStaff.phone,
          role: newStaff.role,
          isActive: newStaff.isActive,
          createdAt: newStaff.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[Staff POST] Error:", error);

    // 🔒 Final safety net (should almost never trigger now)
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
