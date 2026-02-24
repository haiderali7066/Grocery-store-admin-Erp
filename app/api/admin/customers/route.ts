// app/api/admin/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Order, POSSale } from "@/lib/models";
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

    const userIds = users.map((u: any) => u._id);

    // Online order stats
    const onlineStats = await Order.aggregate([
      { $match: { user: { $in: userIds } } },
      {
        $group: {
          _id: "$user",
          onlineOrders: { $sum: 1 },
          onlineSpent: { $sum: "$total" },
        },
      },
    ]);

    // POS sale stats — only linked sales (customer field set)
    const posStats = await POSSale.aggregate([
      { $match: { customer: { $in: userIds } } },
      {
        $group: {
          _id: "$customer",
          posOrders: { $sum: 1 },
          posSpent: { $sum: { $ifNull: ["$total", "$totalAmount"] } },
        },
      },
    ]);

    const onlineMap = Object.fromEntries(
      onlineStats.map((s: any) => [s._id.toString(), s]),
    );
    const posMap = Object.fromEntries(
      posStats.map((s: any) => [s._id.toString(), s]),
    );

    const customers = users.map((u: any) => {
      const uid = u._id.toString();
      const online = onlineMap[uid];
      const pos = posMap[uid];
      return {
        ...u,
        _id: uid,
        totalOrders: (online?.onlineOrders || 0) + (pos?.posOrders || 0),
        totalSpent: (online?.onlineSpent || 0) + (pos?.posSpent || 0),
        onlineOrders: online?.onlineOrders || 0,
        posOrders: pos?.posOrders || 0,
      };
    });

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
