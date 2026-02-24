// app/api/admin/staff/route.ts
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getTokenFromCookie, hashPassword } from "@/lib/auth";

const ALLOWED_ROLES = ["admin", "manager", "accountant", "staff"];

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyAuth(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // -password hides the bcrypt hash; tempPassword is NOT excluded so admin UI receives it
    const staff = await User.find({ role: { $in: ALLOWED_ROLES } })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ staff }, { status: 200 });
  } catch (error) {
    console.error("[Staff GET]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    const payload = verifyAuth(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { name, email, phone, role, password } = await req.json();

    if (!name || !email || !password || !role)
      return NextResponse.json(
        { message: "Name, email, role and password are required" },
        { status: 400 },
      );

    if (!ALLOWED_ROLES.includes(role))
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing)
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });

    const hashedPassword = await hashPassword(password);

    const newStaff = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      password: hashedPassword,
      tempPassword: password,   // plain-text saved so admin can view it
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
          tempPassword: newStaff.tempPassword,
          createdAt: newStaff.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[Staff POST]:", error);
    if (error.code === 11000)
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}