// app/api/admin/customers/[id]/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { POSSale, User } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";
import mongoose from "mongoose";

function requireAdmin(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const customer = await User.findById(objectId).select("name phone addresses").lean() as any;

    // Query by ObjectId + name fallback for legacy/unlinked sales
    const posQuery: any[] = [{ customer: objectId }];
    if (customer?.name) {
      posQuery.push({
        customer: null,
        customerName: { $regex: `^${customer.name}$`, $options: "i" },
      });
    }

    const posSales = await POSSale.find({ $or: posQuery })
      .sort({ createdAt: -1 })
      .lean();

    const formattedSales = (posSales as any[]).map((s) => {
      // Split items into active and returned
      const activeItems = (s.items || []).filter((i: any) => !i.returned);
      const returnedItems = (s.items || []).filter((i: any) => i.returned);

      // Recalculate totals from active items only
      const activeSubtotal = activeItems.reduce(
        (sum: number, i: any) => sum + i.price * i.quantity,
        0,
      );
      const activeTax = activeItems.reduce(
        (sum: number, i: any) => sum + (i.taxAmount ?? 0),
        0,
      );
      const activeTotal = activeItems.reduce(
        (sum: number, i: any) => sum + (i.total ?? i.price * i.quantity),
        0,
      );

      return {
        _id: s._id.toString(),
        saleNumber: s.saleNumber,
        // Use recalculated totals if any items returned, else original
        total: returnedItems.length > 0 ? activeTotal : (s.total ?? s.totalAmount ?? 0),
        subtotal: returnedItems.length > 0 ? activeSubtotal : (s.subtotal ?? 0),
        tax: returnedItems.length > 0 ? activeTax : (s.tax ?? s.gstAmount ?? 0),
        originalTotal: s.total ?? s.totalAmount ?? 0,
        discount: s.discount ?? 0,
        amountPaid: s.amountPaid ?? 0,
        change: s.change ?? 0,
        paymentMethod: s.paymentMethod,
        paymentStatus: s.paymentStatus ?? "completed",
        createdAt: s.createdAt,
        hasReturns: returnedItems.length > 0,
        returnedCount: returnedItems.length,
        // Active items only
        items: activeItems.map((i: any) => ({
          name: i.name || "Item",
          quantity: i.quantity,
          price: i.price,
          taxRate: i.taxRate ?? 0,
          taxAmount: i.taxAmount ?? 0,
          total: i.total ?? i.price * i.quantity,
        })),
        // Returned items shown separately
        returnedItems: returnedItems.map((i: any) => ({
          name: i.name || "Item",
          quantity: i.quantity,
          price: i.price,
          returnedAt: i.returnedAt,
          returnedQty: i.returnedQty ?? i.quantity,
        })),
      };
    });

    // Only include sales that still have active items
    const salesWithItems = formattedSales.filter((s) => s.items.length > 0);

    const totalSpent = salesWithItems.reduce((s, o) => s + o.total, 0);
    const stats = {
      totalSales: salesWithItems.length,
      totalSpent,
      totalItems: salesWithItems.reduce(
        (s, o) => s + o.items.reduce((a: number, i: any) => a + i.quantity, 0),
        0,
      ),
      avgOrder: salesWithItems.length > 0 ? totalSpent / salesWithItems.length : 0,
    };

    return NextResponse.json({ sales: salesWithItems, stats });
  } catch (error: any) {
    console.error("Customer orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}