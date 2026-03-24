// FILE PATH: app/api/admin/purchases/route.ts

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

// Maps lowercase incoming paymentMethod → exact Wallet document field name
const WALLET_KEY: Record<string, string> = {
  cash:      "cash",
  bank:      "bank",
  easypaisa: "easyPaisa",
  jazzcash:  "jazzCash",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash:      "Cash",
  bank:      "Bank Transfer",
  easypaisa: "EasyPaisa",
  jazzcash:  "JazzCash",
  cheque:    "Cheque",
};

// FIX: Transaction.source enum is ["cash","bank","easyPaisa","jazzCash","card"]
// The incoming paymentMethod is always lowercase ("easypaisa", "jazzcash").
// This map converts to the exact casing the schema requires so Mongoose
// validation doesn't silently drop the transaction.
const TRANSACTION_SOURCE: Record<string, string> = {
  cash:      "cash",
  bank:      "bank",
  easypaisa: "easyPaisa",
  jazzcash:  "jazzCash",
  cheque:    "cash",   // cheques come from cash float; adjust if needed
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      supplier,
      products,
      paymentMethod,
      supplierInvoiceNo,
      notes,
      totalAmount,
      amountPaid,
      balanceDue,
    } = body;

    const amountPaidNum  = Number(amountPaid)  || 0;
    const balanceDueNum  = Number(balanceDue)  || 0;
    const totalAmountNum = Number(totalAmount) || 0;
    const methodKey      = paymentMethod?.toLowerCase?.() ?? "";

    // ── Supplier ──────────────────────────────────────────────────────────────
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc)
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // ── Hard wallet balance check ─────────────────────────────────────────────
    if (amountPaidNum > 0) {
      const walletField = WALLET_KEY[methodKey];

      if (!walletField && methodKey !== "cheque") {
        return NextResponse.json(
          { error: `Unknown payment method: ${paymentMethod}` },
          { status: 400 },
        );
      }

      if (walletField) {
        const wallet    = await Wallet.findOne({});
        const available = wallet ? ((wallet as any)[walletField] ?? 0) : 0;

        if (amountPaidNum > available) {
          const label = PAYMENT_LABEL[methodKey] ?? paymentMethod;
          return NextResponse.json(
            {
              error: [
                `Insufficient ${label} wallet balance.`,
                `Available: Rs ${available.toLocaleString()}`,
                `Required: Rs ${amountPaidNum.toLocaleString()}`,
                `Either reduce the amount paid, or record the full order as balance due to the supplier.`,
              ].join(" "),
              code:       "INSUFFICIENT_WALLET_BALANCE",
              available,
              required:   amountPaidNum,
              walletField,
            },
            { status: 400 },
          );
        }
      }
    }

    // ── Products & FIFO batches ───────────────────────────────────────────────
    const purchaseProducts = [];
    const batches          = [];

    for (const item of products) {
      const productDoc = await Product.findById(item.product);
      if (!productDoc)
        return NextResponse.json({ error: `Product not found: ${item.product}` }, { status: 404 });

      const stockBeforePurchase = productDoc.stock ?? 0;
      productDoc.stock += item.quantity;

      if (stockBeforePurchase === 0) productDoc.retailPrice = item.sellingPrice;
      productDoc.lastBuyingRate = item.unitCostWithTax; // full landed cost
      await productDoc.save();

      const profitPerUnit = item.sellingPrice - item.unitCostWithTax;

      const batch = new InventoryBatch({
        product:           productDoc._id,
        quantity:          item.quantity,
        remainingQuantity: item.quantity,
        buyingRate:        item.unitCostWithTax, // full landed cost (FIFO / COGS)
        baseRate:          item.buyingRate,       // pre-tax/freight base rate
        taxValue:          item.taxValue,
        taxType:           item.taxType === "percentage" ? "percent" : "fixed",
        freightPerUnit:    item.freightPerUnit || 0,
        sellingPrice:      item.sellingPrice,
        profitPerUnit,
        status:            "active",
      });
      await batch.save();
      batches.push(batch);

      purchaseProducts.push({
        product:         productDoc._id,
        quantity:        item.quantity,
        buyingRate:      item.buyingRate,
        taxType:         item.taxType === "percentage" ? "percent" : "fixed",
        taxValue:        item.taxValue,
        freightPerUnit:  item.freightPerUnit || 0,
        unitCostWithTax: item.unitCostWithTax,
        sellingPrice:    item.sellingPrice,
        batchNumber:     batch._id,
      });
    }

    // ── Purchase record ───────────────────────────────────────────────────────
    const purchase = new Purchase({
      supplier:          supplierDoc._id,
      supplierInvoiceNo,
      products:          purchaseProducts,
      totalAmount:       totalAmountNum,
      amountPaid:        amountPaidNum,
      balanceDue:        balanceDueNum,
      paymentMethod,
      notes,
      status:            "completed",
      paymentStatus:
        balanceDueNum > 0
          ? amountPaidNum > 0 ? "partial" : "pending"
          : "completed",
    });
    await purchase.save();

    for (const batch of batches) {
      batch.purchaseReference = purchase._id;
      await batch.save();
    }

    // ── Supplier ledger ───────────────────────────────────────────────────────
    supplierDoc.balance = (supplierDoc.balance || 0) + balanceDueNum;
    await supplierDoc.save();

    // ── Wallet deduction ─────────────────────────────────────────────────────
    if (amountPaidNum > 0) {
      const walletField = WALLET_KEY[methodKey];

      if (walletField) {
        let wallet = await Wallet.findOne();
        if (!wallet) wallet = new Wallet();
        (wallet as any)[walletField] = ((wallet as any)[walletField] || 0) - amountPaidNum;
        wallet.lastUpdated = new Date();
        await wallet.save();
      }

      // FIX: use TRANSACTION_SOURCE map so the value matches the schema enum
      // exactly (e.g. "easyPaisa" not "easypaisa", "jazzCash" not "jazzcash").
      // Previously this would cause Mongoose validation to fail silently,
      // meaning purchase expense transactions were never saved to the DB.
      const transactionSource = TRANSACTION_SOURCE[methodKey] ?? "cash";

      await new Transaction({
        type:           "expense",
        category:       "Purchase",
        amount:         amountPaidNum,
        source:         transactionSource,          // ← fixed
        reference:      purchase._id,
        referenceModel: "Purchase",
        description:    `Purchase from ${supplierDoc.name} – Invoice: ${supplierInvoiceNo || "N/A"}`,
        notes,
        createdBy:      payload.userId,
      }).save();
    }

    return NextResponse.json(
      {
        message: "Purchase created successfully",
        purchase,
        batches: batches.map(b => ({
          id:              b._id,
          quantity:        b.quantity,
          unitCostWithTax: b.buyingRate,
          sellingPrice:    b.sellingPrice,
          profitPerUnit:   b.profitPerUnit,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Purchase creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const purchases = await Purchase.find()
      .populate("supplier", "name email phone")
      .populate("products.product", "name sku retailPrice")
      .sort({ createdAt: -1 });

    return NextResponse.json({ purchases }, { status: 200 });
  } catch (error) {
    console.error("Purchases fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}