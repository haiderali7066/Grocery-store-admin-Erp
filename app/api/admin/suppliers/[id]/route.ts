import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Supplier, Purchase } from "@/lib/models";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;

    // 1. Find the supplier
    const supplier = await Supplier.findById(id).lean();
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // 2. Fetch all purchases for this supplier to show history
    const purchases = await Purchase.find({ supplier: id })
      .sort({ createdAt: -1 }) // Newest first
      .select('createdAt supplierInvoiceNo totalAmount amountPaid balanceDue paymentMethod')
      .lean();

    return NextResponse.json({ 
      supplier: { ...supplier, purchases } 
    });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connectDB();
  const { id } = await params;
  const data = await req.json();
  const supplier = await Supplier.findByIdAndUpdate(id, data, { new: true });
  return NextResponse.json({ supplier });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connectDB();
  const { id } = await params;
  // Soft delete or hard delete based on your preference
  await Supplier.findByIdAndDelete(id);
  // Optionally delete purchase history too
  await Purchase.deleteMany({ supplier: id }); 
  return NextResponse.json({ message: "Supplier and records deleted" });
}