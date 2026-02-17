// app/api/admin/customers/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Order } from "@/lib/models";
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
    const search = searchParams.get("search") || "";

    const query: any = { role: "user" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Attach aggregated order stats
    const userIds = users.map((u: any) => u._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: userIds } } },
      {
        $group: {
          _id: "$user",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
    ]);
    const statsMap = Object.fromEntries(
      orderStats.map((s: any) => [s._id.toString(), s]),
    );

    const customers = users.map((u: any) => ({
      ...u,
      _id: u._id.toString(),
      totalOrders: statsMap[u._id.toString()]?.totalOrders || 0,
      totalSpent: statsMap[u._id.toString()]?.totalSpent || 0,
    }));

    return NextResponse.json({ customers, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, phone, addresses } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const bcrypt = await import("bcryptjs");
    const tempPassword = await bcrypt.default.hash(
      Math.random().toString(36) + Date.now(),
      10,
    );

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      phone: phone || "",
      addresses: addresses || [],
      role: "user",
    });

    const { password: _p, ...safeUser } = user.toObject();
    return NextResponse.json({ customer: safeUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
