import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier, Purchase } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const supplier = await Supplier.findById(id).lean();
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    const purchases = await Purchase.find({ supplier: id })
      .sort({ createdAt: -1 })
      .select(
        "createdAt supplierInvoiceNo totalAmount amountPaid balanceDue paymentMethod",
      )
      .lean();

    return NextResponse.json(
      { supplier: { ...supplier, purchases } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Supplier fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { name, email, phone, address, city, contact } = await req.json();

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      { name, email, phone, address, city, contact },
      { new: true },
    );

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Supplier updated successfully", supplier },
      { status: 200 },
    );
  } catch (error) {
    console.error("Supplier update error:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    // Optionally delete purchase history
    await Purchase.deleteMany({ supplier: id });

    return NextResponse.json(
      { message: "Supplier and purchase history deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Supplier deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 },
    );
  }
}

