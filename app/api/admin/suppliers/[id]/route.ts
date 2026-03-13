// FILE PATH: app/api/admin/suppliers/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier, Purchase, Transaction } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

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
    if (!payload || !["admin", "accountant", "manager", "staff"].includes(payload.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid supplier ID" }, { status: 400 });

    const supplier = await Supplier.findById(id).lean();
    if (!supplier)
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // ── Purchase history ────────────────────────────────────────────────────
    const purchases = await Purchase.find({ supplier: id })
      .sort({ createdAt: -1 })
      .populate({ path: "products.product", select: "name sku" })
      .select(
        "createdAt supplierInvoiceNo totalAmount amountPaid balanceDue " +
        "paymentMethod paymentStatus notes " +
        "products.product products.quantity products.buyingRate " +
        "products.unitCostWithTax products.sellingPrice " +
        "products.taxType products.taxValue products.freightPerUnit",
      )
      .lean();

    // ── Payment transactions ────────────────────────────────────────────────
    // Wrapped in its own try/catch so that if the Transaction schema does NOT
    // have a `reference` or `referenceModel` field, the crash is isolated and
    // the rest of the response still returns correctly.
    let paymentTransactions: any[] = [];
    try {
      paymentTransactions = await Transaction.find({
        category:  "Supplier Payment",
        reference: new mongoose.Types.ObjectId(id),
      })
        .sort({ createdAt: -1 })
        .select("createdAt amount source description notes")
        .lean();

      // Fallback: description-regex match in case reference field is absent
      if (paymentTransactions.length === 0) {
        paymentTransactions = await Transaction.find({
          category:    "Supplier Payment",
          description: { $regex: (supplier as any).name, $options: "i" },
        })
          .sort({ createdAt: -1 })
          .select("createdAt amount source description notes")
          .lean();
      }
    } catch {
      // Schema lacks `reference` field — degrade gracefully, don't crash
      paymentTransactions = [];
    }

    // ── Pre-compute totals ─────────────────────────────────────────────────
    const totalBilled = purchases.reduce((s, p) => s + ((p as any).totalAmount || 0), 0);
    const paidAtTime  = purchases.reduce((s, p) => s + ((p as any).amountPaid  || 0), 0);
    const paidLater   = paymentTransactions.reduce((s, t) => s + ((t as any).amount || 0), 0);
    const totalPaid   = paidAtTime + paidLater;
    const totalDue    = Math.max(0, totalBilled - totalPaid);
    const totalItems  = purchases.reduce(
      (s, p) => s + ((p as any).products?.reduce((ps: number, pr: any) => ps + (pr.quantity || 0), 0) ?? 0),
      0,
    );

    return NextResponse.json({
      supplier: {
        ...supplier,
        purchases,
        paymentTransactions,
        computedStats: { totalBilled, totalPaid, paidAtTime, paidLater, totalDue, totalItems },
      },
    }, { status: 200 });

  } catch (error) {
    console.error("[Supplier GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch supplier" },
      { status: 500 },
    );
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
    if (!payload || !["admin", "manager"].includes(payload.role))
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