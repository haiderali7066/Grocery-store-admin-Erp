import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    // ... Auth check ...
    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
    return NextResponse.json({ suppliers }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    // ... Auth check ...
    const { name, email, phone } = await req.json();
    const supplier = new Supplier({
      name,
      email,
      phone,
      balance: 0,
      isActive: true,
    });
    await supplier.save();
    return NextResponse.json(
      { message: "Supplier created", supplier },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
