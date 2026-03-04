// FILE PATH: app/api/admin/inventory/route.ts

import { connectDB } from "@/lib/db";
import { Product, InventoryBatch } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !["admin", "manager", "accountant", "staff"].includes(payload.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const products = await Product.find();

    const inventory = await Promise.all(
      products.map(async (product) => {
        // All batches for this product, oldest first (FIFO order)
        const batches = await InventoryBatch.find({
          product: product._id,
        }).sort({ createdAt: 1 });

        // Current active batch = oldest batch that still has remaining stock
        // This is the batch whose price is currently in use
        const currentBatch = batches.find(
          (b) => (b.remainingQuantity ?? 0) > 0 &&
                 (b.status === "active" || b.status === "partial"),
        );

        // ─── Schema note ─────────────────────────────────────────────────────
        // InventoryBatch stores:
        //   buyingRate    = full landed cost (unitCostWithTax from purchase)
        //   baseRate      = base buying rate before tax & freight
        //
        // The frontend inventory table expects:
        //   batch.buyingRate    → "Base Rate" column
        //   batch.unitCostWithTax → "Unit Cost" column
        //
        // So we remap here to match what the UI expects.
        // ─────────────────────────────────────────────────────────────────────
        const formatBatch = (b: (typeof batches)[number]) => ({
          _id: b._id,
          quantity: b.quantity,
          remainingQuantity: b.remainingQuantity ?? 0,
          // baseRate is the pre-tax/freight buying price shown as "Base Rate" in UI
          buyingRate: b.baseRate ?? b.buyingRate,
          taxType: b.taxType || "percent",
          taxValue: b.taxValue ?? 0,
          freightPerUnit: b.freightPerUnit ?? 0,
          // buyingRate in the DB is the full landed cost; map it to unitCostWithTax for UI
          unitCostWithTax: b.buyingRate,
          sellingPrice: b.sellingPrice ?? 0,
          profitPerUnit: b.profitPerUnit ?? (b.sellingPrice - b.buyingRate),
          status: b.status,
          isReturn: b.isReturn ?? false,
          createdAt: b.createdAt,
        });

        return {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          stock: product.stock ?? 0,
          batches: batches.map(formatBatch),
          currentBatch: currentBatch ? formatBatch(currentBatch) : null,
          lowStockThreshold: product.lowStockThreshold ?? 10,
        };
      }),
    );

    return NextResponse.json({ inventory }, { status: 200 });
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}