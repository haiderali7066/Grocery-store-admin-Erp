// app/api/admin/refunds/manual/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Refund, Product } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { orderNumber, amount, reason, notes, items } = body;

    // `items` is optional — if provided it's an array of:
    // { productId?, name, returnQty, unitPrice, restock: boolean }
    //
    // `amount` can be omitted if items are provided — we'll calculate it.

    if (!orderNumber)
      return NextResponse.json(
        { error: "orderNumber is required" },
        { status: 400 },
      );

    // ── Validate items if supplied ──────────────────────────────────────────
    let calculatedAmount = parseFloat(amount) || 0;
    const returnItems: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.name || !item.returnQty || item.returnQty <= 0)
          return NextResponse.json(
            { error: `Invalid item: ${JSON.stringify(item)}` },
            { status: 400 },
          );

        const lineTotal =
          (parseFloat(item.unitPrice) || 0) * parseInt(item.returnQty);

        returnItems.push({
          productId: item.productId || null,
          name: item.name,
          returnQty: parseInt(item.returnQty),
          unitPrice: parseFloat(item.unitPrice) || 0,
          lineTotal,
          restock: item.restock !== false, // default true
        });
      }

      // Recalculate total from items (overrides manual amount)
      calculatedAmount = returnItems.reduce((sum, i) => sum + i.lineTotal, 0);
    }

    if (!calculatedAmount || calculatedAmount <= 0)
      return NextResponse.json(
        { error: "Return amount must be greater than 0" },
        { status: 400 },
      );

    // ── If items have restock=true, add stock back ─────────────────────────
    const restockErrors: string[] = [];
    for (const item of returnItems) {
      if (item.restock && item.productId) {
        try {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.returnQty },
          });
        } catch (err) {
          restockErrors.push(`Could not restock ${item.name}`);
        }
      }
    }

    // ── Create the refund record ───────────────────────────────────────────
    const refund = new Refund({
      orderNumber,
      returnType: "pos_manual",
      requestedAmount: calculatedAmount,
      refundedAmount: calculatedAmount, // POS returns are immediate
      deliveryCost: 0,
      reason: reason || "pos_return",
      notes: notes || "",
      returnItems: returnItems.length > 0 ? returnItems : undefined,
      status: "completed", // POS manual returns are auto-completed
    });

    await refund.save();

    return NextResponse.json(
      {
        success: true,
        message: restockErrors.length
          ? `Return created. Restock warnings: ${restockErrors.join(", ")}`
          : "Manual return created and stock updated",
        refund,
        restockErrors,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Manual return error:", error);
    return NextResponse.json(
      { error: "Failed to create manual return" },
      { status: 500 },
    );
  }
}
