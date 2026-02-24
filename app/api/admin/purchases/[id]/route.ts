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

function walletKey(method: string): "cash" | "bank" | "easyPaisa" | "jazzCash" | null {
  switch (method) {
    case "cash": return "cash";
    case "bank": return "bank";
    case "easypaisa": return "easyPaisa";
    case "jazzcash": return "jazzCash";
    default: return null;
  }
}

async function applyWalletDelta(method: string, delta: number) {
  // delta > 0 = add back to wallet, delta < 0 = deduct from wallet
  const key = walletKey(method);
  if (!key) return; // cheque — no wallet tracking
  const wallet = await Wallet.findOne();
  if (!wallet) return;
  wallet[key] = (wallet[key] || 0) + delta;
  wallet.lastUpdated = new Date();
  await wallet.save();
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
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });

    return NextResponse.json({ purchase }, { status: 200 });
  } catch (err) {
    console.error("GET purchase error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/admin/purchases/[id] ─────────────────────────────────────────
// Fully reverses all effects: stock, batches, supplier balance, wallet, transaction

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
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });

    // ── 1. Reverse stock & batch for each product ─────────────────────────
    for (const item of purchase.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = Math.max(0, (product.stock || 0) - item.quantity);

        // Reset retail/buying price from the next-most-recent active batch
        const remainingBatch = await InventoryBatch.findOne({
          product: product._id,
          _id: { $ne: item.batchNumber },
          status: { $in: ["active", "partial"] },
        }).sort({ createdAt: -1 });

        if (remainingBatch) {
          product.retailPrice = remainingBatch.sellingPrice;
          product.lastBuyingRate = remainingBatch.buyingRate;
        }
        await product.save();
      }

      // Delete the batch created by this purchase
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

    // ── 3. Refund wallet ──────────────────────────────────────────────────
    if (purchase.amountPaid > 0) {
      await applyWalletDelta(purchase.paymentMethod, purchase.amountPaid); // +ve = refund
    }

    // ── 4. Remove transaction record ──────────────────────────────────────
    await Transaction.deleteOne({ reference: purchase._id, referenceModel: "Purchase" });

    // ── 5. Delete the purchase ────────────────────────────────────────────
    await Purchase.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Purchase deleted and all changes reversed" }, { status: 200 });
  } catch (err) {
    console.error("DELETE purchase error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ── PUT /api/admin/purchases/[id] ─────────────────────────────────────────────
//
// Supports FULL editing of all fields including products.
// Strategy:
//   1. For each OLD product line → reverse stock deduction + delete old batch
//   2. For each NEW product line → add stock + create new batch
//   3. Adjust supplier balance (old balanceDue vs new balanceDue)
//   4. Adjust wallet (old amountPaid vs new amountPaid, with possible method change)
//   5. Update transaction record
//   6. Save updated purchase

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
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });

    const body = await req.json();
    const {
      supplier: newSupplierId,
      products: newProducts,
      paymentMethod: newPaymentMethod,
      supplierInvoiceNo,
      notes,
      totalAmount: newTotalAmount,
      amountPaid: newAmountPaidRaw,
      balanceDue: newBalanceDue,
    } = body;

    const newAmountPaid = parseFloat(newAmountPaidRaw) || 0;
    const oldAmountPaid = purchase.amountPaid || 0;
    const oldBalanceDue = purchase.balanceDue || 0;
    const oldPaymentMethod = purchase.paymentMethod;

    // ── STEP 1: Reverse old product effects ───────────────────────────────
    for (const item of purchase.products) {
      const product = await Product.findById(item.product);
      if (product) {
        // Remove the stock that was added by this purchase item
        product.stock = Math.max(0, (product.stock || 0) - item.quantity);
        await product.save();
      }
      // Delete the old inventory batch
      if (item.batchNumber) {
        await InventoryBatch.findByIdAndDelete(item.batchNumber);
      }
    }

    // ── STEP 2: Apply new product effects ─────────────────────────────────
    const newPurchaseProducts = [];
    for (const item of newProducts) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json({ message: `Product not found: ${item.product}` }, { status: 404 });
      }

      // Add new stock
      product.stock = (product.stock || 0) + item.quantity;
      product.retailPrice = item.sellingPrice;
      product.lastBuyingRate = item.unitCostWithTax;
      await product.save();

      const profitPerUnit = item.sellingPrice - item.unitCostWithTax;

      // Create new inventory batch
      const batch = new InventoryBatch({
        product: product._id,
        quantity: item.quantity,
        remainingQuantity: item.quantity,
        buyingRate: item.unitCostWithTax,
        baseRate: item.buyingRate,
        taxValue: item.taxValue,
        taxType: item.taxType === "percentage" ? "percent" : "fixed",
        freightPerUnit: item.freightPerUnit || 0,
        sellingPrice: item.sellingPrice,
        profitPerUnit,
        status: "active",
        purchaseReference: purchase._id,
      });
      await batch.save();

      newPurchaseProducts.push({
        product: product._id,
        quantity: item.quantity,
        buyingRate: item.buyingRate,
        taxType: item.taxType === "percentage" ? "percent" : "fixed",
        taxValue: item.taxValue,
        freightPerUnit: item.freightPerUnit || 0,
        unitCostWithTax: item.unitCostWithTax,
        sellingPrice: item.sellingPrice,
        batchNumber: batch._id,
      });
    }

    // ── STEP 3: Adjust supplier balance ───────────────────────────────────
    // Remove old balance due, add new balance due
    const oldSupplierId = purchase.supplier.toString();
    const supplierChanged = newSupplierId && newSupplierId !== oldSupplierId;

    if (supplierChanged) {
      // Reverse from old supplier
      const oldSupplier = await Supplier.findById(oldSupplierId);
      if (oldSupplier) {
        oldSupplier.balance = (oldSupplier.balance || 0) - oldBalanceDue;
        await oldSupplier.save();
      }
      // Apply to new supplier
      const newSupplier = await Supplier.findById(newSupplierId);
      if (newSupplier) {
        newSupplier.balance = (newSupplier.balance || 0) + (newBalanceDue || 0);
        await newSupplier.save();
      }
    } else {
      // Same supplier — adjust the delta
      const supplier = await Supplier.findById(oldSupplierId);
      if (supplier) {
        const balanceDiff = (newBalanceDue || 0) - oldBalanceDue;
        supplier.balance = (supplier.balance || 0) + balanceDiff;
        await supplier.save();
      }
    }

    // ── STEP 4: Adjust wallet ─────────────────────────────────────────────
    const methodChanged = newPaymentMethod && newPaymentMethod !== oldPaymentMethod;

    if (methodChanged) {
      // Refund the full old amount to old wallet
      if (oldAmountPaid > 0) {
        await applyWalletDelta(oldPaymentMethod, oldAmountPaid); // refund
      }
      // Deduct new amount from new wallet
      if (newAmountPaid > 0) {
        await applyWalletDelta(newPaymentMethod, -newAmountPaid); // deduct
      }
    } else {
      // Same method — only adjust the diff
      const paymentDiff = newAmountPaid - oldAmountPaid;
      if (paymentDiff !== 0) {
        await applyWalletDelta(newPaymentMethod || oldPaymentMethod, -paymentDiff); // deduct more if +, refund if -
      }
    }

    // ── STEP 5: Update transaction record ─────────────────────────────────
    const newSupplierDoc = await Supplier.findById(newSupplierId || oldSupplierId);
    await Transaction.findOneAndUpdate(
      { reference: purchase._id, referenceModel: "Purchase" },
      {
        $set: {
          amount: newAmountPaid,
          source: newPaymentMethod || oldPaymentMethod,
          notes: notes || purchase.notes,
          description: `Purchase from ${newSupplierDoc?.name || "Supplier"} - Invoice: ${supplierInvoiceNo || "N/A"}`,
        },
      },
    );

    // ── STEP 6: Save purchase ─────────────────────────────────────────────
    purchase.supplier = newSupplierId || purchase.supplier;
    purchase.products = newPurchaseProducts;
    purchase.totalAmount = newTotalAmount || newPurchaseProducts.reduce((s: number, p: any) => s + p.quantity * p.unitCostWithTax, 0);
    purchase.amountPaid = newAmountPaid;
    purchase.balanceDue = newBalanceDue || (purchase.totalAmount - newAmountPaid);
    purchase.paymentMethod = newPaymentMethod || oldPaymentMethod;
    purchase.paymentStatus =
      purchase.balanceDue > 0
        ? newAmountPaid > 0 ? "partial" : "pending"
        : "completed";
    purchase.notes = notes ?? purchase.notes;
    purchase.supplierInvoiceNo = supplierInvoiceNo ?? purchase.supplierInvoiceNo;

    await purchase.save();

    return NextResponse.json({ message: "Purchase fully updated", purchase }, { status: 200 });
  } catch (err) {
    console.error("PUT purchase error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}