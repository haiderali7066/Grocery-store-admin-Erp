// app/api/admin/purchases/[id]/route.ts

import { connectDB } from "@/lib/db";
import {
  Purchase,
  Product,
  InventoryBatch,
  Supplier,
  Transaction,
  Wallet,
} from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromCookie(req.headers.get("cookie") || "");
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// ── GET /api/admin/purchases/[id] ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    if (!auth(req))
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const purchase = await Purchase.findById(params.id)
      .populate("supplier", "name email phone")
      .populate("products.product", "name sku retailPrice")
      .lean();

    if (!purchase)
      return NextResponse.json(
        { message: "Purchase not found" },
        { status: 404 },
      );

    return NextResponse.json({ purchase }, { status: 200 });
  } catch (err) {
    console.error("GET purchase error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/admin/purchases/[id] ─────────────────────────────────────────
// Reverses everything: stock, retail price, batches, supplier balance, wallet, transaction

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const purchase = await Purchase.findById(params.id);
    if (!purchase)
      return NextResponse.json(
        { message: "Purchase not found" },
        { status: 404 },
      );

    // ── 1. Reverse stock & retail price for each product ──────────────────
    for (const item of purchase.products) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      // Deduct the quantity that was added
      product.stock = Math.max(0, (product.stock || 0) - item.quantity);

      // If this was the latest batch setting the retail price, reset it
      // by finding the next most recent batch for this product
      const remainingBatch = await InventoryBatch.findOne({
        product: product._id,
        _id: { $ne: item.batchNumber },
        status: { $in: ["active", "partial"] },
      }).sort({ createdAt: -1 });

      if (remainingBatch) {
        product.retailPrice = remainingBatch.sellingPrice;
        product.lastBuyingRate = remainingBatch.buyingRate;
      }
      // If no remaining batch, leave price as-is (safer than zeroing it)

      await product.save();

      // Delete the inventory batch created by this purchase
      if (item.batchNumber) {
        await InventoryBatch.findByIdAndDelete(item.batchNumber);
      }
    }

    // ── 2. Reverse supplier balance ───────────────────────────────────────
    const supplier = await Supplier.findById(purchase.supplier);
    if (supplier) {
      supplier.balance = (supplier.balance || 0) - (purchase.balanceDue || 0);
      await supplier.save();
    }

    // ── 3. Reverse wallet deduction ───────────────────────────────────────
    if (purchase.amountPaid > 0) {
      const wallet = await Wallet.findOne();
      if (wallet) {
        switch (purchase.paymentMethod) {
          case "cash":
            wallet.cash = (wallet.cash || 0) + purchase.amountPaid;
            break;
          case "bank":
            wallet.bank = (wallet.bank || 0) + purchase.amountPaid;
            break;
          case "easypaisa":
            wallet.easyPaisa = (wallet.easyPaisa || 0) + purchase.amountPaid;
            break;
          case "jazzcash":
            wallet.jazzCash = (wallet.jazzCash || 0) + purchase.amountPaid;
            break;
        }
        wallet.lastUpdated = new Date();
        await wallet.save();
      }

      // Delete the expense transaction
      await Transaction.deleteOne({
        reference: purchase._id,
        referenceModel: "Purchase",
      });
    }

    // ── 4. Delete the purchase ────────────────────────────────────────────
    await Purchase.findByIdAndDelete(params.id);

    return NextResponse.json(
      { message: "Purchase deleted and all changes reversed" },
      { status: 200 },
    );
  } catch (err) {
    console.error("DELETE purchase error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── PUT /api/admin/purchases/[id] ─────────────────────────────────────────────
// Updates payment fields only (amountPaid, paymentMethod, notes, supplierInvoiceNo).
// Product quantities and prices are NOT re-processed to avoid double-counting.
// For product changes, delete and recreate the purchase.

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    const payload = auth(req);
    if (!payload)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const purchase = await Purchase.findById(params.id);
    if (!purchase)
      return NextResponse.json(
        { message: "Purchase not found" },
        { status: 404 },
      );

    const body = await req.json();
    const { amountPaid, paymentMethod, notes, supplierInvoiceNo } = body;

    const oldAmountPaid = purchase.amountPaid || 0;
    const newAmountPaid = parseFloat(amountPaid) ?? oldAmountPaid;
    const paymentDiff = newAmountPaid - oldAmountPaid; // positive = paying more

    // ── Update supplier balance ───────────────────────────────────────────
    // Old balanceDue = totalAmount - oldAmountPaid
    // New balanceDue = totalAmount - newAmountPaid
    const newBalanceDue = purchase.totalAmount - newAmountPaid;
    const balanceDiff = newBalanceDue - (purchase.balanceDue || 0); // how much MORE is owed

    const supplier = await Supplier.findById(purchase.supplier);
    if (supplier) {
      supplier.balance = (supplier.balance || 0) + balanceDiff;
      await supplier.save();
    }

    // ── Update wallet ─────────────────────────────────────────────────────
    const method = paymentMethod || purchase.paymentMethod;
    if (paymentDiff !== 0) {
      const wallet = await Wallet.findOne();
      if (wallet) {
        // Deduct additional payment (or refund if paying less)
        switch (method) {
          case "cash":
            wallet.cash = (wallet.cash || 0) - paymentDiff;
            break;
          case "bank":
            wallet.bank = (wallet.bank || 0) - paymentDiff;
            break;
          case "easypaisa":
            wallet.easyPaisa = (wallet.easyPaisa || 0) - paymentDiff;
            break;
          case "jazzcash":
            wallet.jazzCash = (wallet.jazzCash || 0) - paymentDiff;
            break;
        }
        wallet.lastUpdated = new Date();
        await wallet.save();
      }
    }

    // ── Update transaction record ─────────────────────────────────────────
    await Transaction.findOneAndUpdate(
      { reference: purchase._id, referenceModel: "Purchase" },
      {
        $set: {
          amount: newAmountPaid,
          source: method,
          notes: notes || purchase.notes,
        },
      },
    );

    // ── Save purchase ─────────────────────────────────────────────────────
    purchase.amountPaid = newAmountPaid;
    purchase.balanceDue = newBalanceDue;
    purchase.paymentMethod = method;
    purchase.paymentStatus =
      newBalanceDue > 0
        ? newAmountPaid > 0
          ? "partial"
          : "pending"
        : "completed";
    purchase.notes = notes ?? purchase.notes;
    purchase.supplierInvoiceNo =
      supplierInvoiceNo ?? purchase.supplierInvoiceNo;

    await purchase.save();

    return NextResponse.json(
      { message: "Purchase updated", purchase },
      { status: 200 },
    );
  } catch (err) {
    console.error("PUT purchase error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
