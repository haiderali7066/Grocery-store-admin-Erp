// app/api/admin/pos/sale/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { POSSale, Wallet, Transaction, Product, InventoryBatch, Refund } from "@/lib/models";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    if (!auth(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const sale = await POSSale.findById(params.id).populate("cashier", "name").lean();
    if (!sale) return NextResponse.json({ message: "Sale not found" }, { status: 404 });
    return NextResponse.json({ sale }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── DELETE — reverses stock, wallet, and transaction ─────────────────────────
// Correctly accounts for items already returned via the refund system
// so stock is never double-restored.

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    if (!auth(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const sale = await POSSale.findById(params.id);
    if (!sale) return NextResponse.json({ message: "Sale not found" }, { status: 404 });

    const saleNumber = (sale as any).saleNumber;
    const saleAmount = sale.totalAmount || sale.total || 0;
    const paymentMethod = sale.paymentMethod?.toLowerCase() || "cash";

    // ── 1. Find all completed/approved refunds for this sale ──────────────
    // We need to know which items + quantities were already restocked by the
    // refund system so we don't restore them again here.
    const existingRefunds = await Refund.find({
      orderNumber: saleNumber,
      status: { $in: ["completed", "approved"] },
    }).lean();

    // Build a map of productId/name → already-restocked quantity
    const alreadyRestockedQty: Record<string, number> = {};
    let alreadyRefundedAmount = 0;

    for (const refund of existingRefunds) {
      alreadyRefundedAmount += (refund as any).refundedAmount || 0;
      for (const ri of (refund as any).returnItems || []) {
        const key = ri.productId?.toString() || ri.name;
        alreadyRestockedQty[key] = (alreadyRestockedQty[key] || 0) + (ri.returnQty || 0);
      }
    }

    // ── 2. Restore stock for each item (minus already-restocked qty) ───────
    let itemsRestored = 0;
    for (const item of sale.items || []) {
      const productId = item.product || item.productId;
      const totalQty = item.quantity || 0;
      if (!productId || !totalQty) continue;

      // How many units were already put back by the refund system?
      const itemKey = productId.toString() || item.name;
      const alreadyBack = alreadyRestockedQty[itemKey] || 0;
      const qtyToRestore = totalQty - alreadyBack;

      if (qtyToRestore <= 0) {
        // This item was fully returned already — skip stock restore
        continue;
      }

      itemsRestored++;

      // Restore product stock
      const product = await Product.findById(productId);
      if (product) {
        product.stock = (product.stock || 0) + qtyToRestore;
        await product.save();
      }

      // Restore FIFO batch quantity
      if (item.batchId) {
        const batch = await InventoryBatch.findById(item.batchId);
        if (batch) {
          batch.remainingQuantity = (batch.remainingQuantity || 0) + qtyToRestore;
          if (batch.status === "finished") batch.status = "partial";
          await batch.save();
        }
      } else {
        // No batch ref — restore to latest batch for the product
        const batch = await InventoryBatch.findOne({
          product: productId,
          status: { $in: ["active", "partial", "finished"] },
        }).sort({ createdAt: -1 });

        if (batch) {
          batch.remainingQuantity = (batch.remainingQuantity || 0) + qtyToRestore;
          if (batch.status === "finished" && batch.remainingQuantity > 0) batch.status = "partial";
          await batch.save();
        }
      }
    }

    // ── 3. Refund wallet (only the un-refunded portion) ───────────────────
    // If some items were already refunded via the return system, that amount
    // was already deducted from the wallet — so only reverse the remainder.
    const walletRestoreAmount = Math.max(0, saleAmount - alreadyRefundedAmount);

    const wallet = await Wallet.findOne();
    if (wallet && walletRestoreAmount > 0) {
      switch (paymentMethod) {
        case "cash":      wallet.cash      = (wallet.cash      || 0) + walletRestoreAmount; break;
        case "bank":
        case "card":      wallet.bank      = (wallet.bank      || 0) + walletRestoreAmount; break;
        case "easypaisa": wallet.easyPaisa = (wallet.easyPaisa || 0) + walletRestoreAmount; break;
        case "jazzcash":  wallet.jazzCash  = (wallet.jazzCash  || 0) + walletRestoreAmount; break;
        default:          wallet.cash      = (wallet.cash      || 0) + walletRestoreAmount; break;
      }
      wallet.lastUpdated = new Date();
      await wallet.save();
    }

    // ── 4. Delete transaction record ──────────────────────────────────────
    await Transaction.deleteOne({
      $or: [
        { reference: sale._id, referenceModel: "POSSale" },
        { reference: sale._id },
      ],
    });

    // ── 5. Delete any associated completed refund records for this sale ───
    // Since the sale is being voided entirely, clean up refund records too
    if (saleNumber) {
      await Refund.deleteMany({ orderNumber: saleNumber });
    }

    // ── 6. Delete the sale ────────────────────────────────────────────────
    await POSSale.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: "Sale deleted. Stock restored and wallet refunded.",
      reversed: {
        totalSaleAmount: saleAmount,
        alreadyRefundedAmount,
        walletRestoreAmount,
        paymentMethod,
        itemsRestored,
        itemsSkipped: (sale.items || []).length - itemsRestored,
      },
    }, { status: 200 });

  } catch (err) {
    console.error("DELETE POS sale error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}