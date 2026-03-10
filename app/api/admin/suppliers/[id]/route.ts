// FILE PATH: app/api/admin/suppliers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier, Purchase } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  return verifyToken(token);
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || !["admin", "accountant", "manager"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const supplier = await Supplier.findById(id).lean();
    if (!supplier)
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // Fetch ALL purchase fields and populate product details for the history table
    const purchases = await Purchase.find({ supplier: id })
      .sort({ createdAt: -1 })
      .populate({
        path:   "products.product",
        select: "name sku",
      })
      .select(
        "createdAt supplierInvoiceNo totalAmount amountPaid balanceDue " +
        "paymentMethod paymentStatus notes " +
        "products.product products.quantity products.buyingRate " +
        "products.unitCostWithTax products.sellingPrice " +
        "products.taxType products.taxValue products.freightPerUnit",
      )
      .lean();

    return NextResponse.json(
      { supplier: { ...supplier, purchases } },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Supplier GET]", error);
    return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 });
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name, email, phone, address, city, contact } = await req.json();

    if (!name?.trim())
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      { name: name.trim(), email, phone, address, city, contact },
      { new: true },
    );
    if (!supplier)
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    return NextResponse.json({ message: "Supplier updated successfully", supplier }, { status: 200 });
  } catch (error) {
    console.error("[Supplier PUT]", error);
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier)
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    await Purchase.deleteMany({ supplier: id });

    return NextResponse.json(
      { message: "Supplier and purchase history deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Supplier DELETE]", error);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}