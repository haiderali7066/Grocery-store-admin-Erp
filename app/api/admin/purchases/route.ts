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

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

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

    // Validate supplier
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    // Validate and process products
    const purchaseProducts = [];
    const batches = [];

    for (const item of products) {
      const productDoc = await Product.findById(item.product);
      if (!productDoc) {
        return NextResponse.json(
          { error: `Product not found: ${item.product}` },
          { status: 404 },
        );
      }

      // Update product stock
      productDoc.stock += item.quantity;

      // Update product retail price with selling price from this batch
      productDoc.retailPrice = item.sellingPrice;

      // Store the landed cost as lastBuyingRate
      productDoc.lastBuyingRate = item.unitCostWithTax;

      await productDoc.save();

      // Calculate profit per unit
      const profitPerUnit = item.sellingPrice - item.unitCostWithTax;

      // Create inventory batch for FIFO tracking
      const batch = new InventoryBatch({
        product: productDoc._id,
        quantity: item.quantity,
        remainingQuantity: item.quantity,
        buyingRate: item.unitCostWithTax, // Full landed cost
        baseRate: item.buyingRate, // Base price before tax & freight
        taxValue: item.taxValue,
        taxType: item.taxType === "percentage" ? "percent" : "fixed",
        freightPerUnit: item.freightPerUnit || 0,
        sellingPrice: item.sellingPrice,
        profitPerUnit: profitPerUnit,
        status: "active",
      });

      await batch.save();
      batches.push(batch);

      purchaseProducts.push({
        product: productDoc._id,
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

    // Create purchase record
    const purchase = new Purchase({
      supplier: supplierDoc._id,
      supplierInvoiceNo,
      products: purchaseProducts,
      totalAmount: totalAmount,
      amountPaid: amountPaid,
      balanceDue: balanceDue,
      paymentMethod,
      notes,
      status: "completed",
      paymentStatus:
        balanceDue > 0 ? (amountPaid > 0 ? "partial" : "pending") : "completed",
    });

    await purchase.save();

    // Link purchase to batches
    for (const batch of batches) {
      batch.purchaseReference = purchase._id;
      await batch.save();
    }

    // Update supplier balance (add the balance due)
    supplierDoc.balance = (supplierDoc.balance || 0) + balanceDue;
    await supplierDoc.save();

    // Update wallet based on payment method (deduct amount paid)
    if (amountPaid > 0) {
      let wallet = await Wallet.findOne();
      if (!wallet) {
        wallet = new Wallet();
      }

      switch (paymentMethod) {
        case "cash":
          wallet.cash = (wallet.cash || 0) - amountPaid;
          break;
        case "bank":
          wallet.bank = (wallet.bank || 0) - amountPaid;
          break;
        case "easypaisa":
          wallet.easyPaisa = (wallet.easyPaisa || 0) - amountPaid;
          break;
        case "jazzcash":
          wallet.jazzCash = (wallet.jazzCash || 0) - amountPaid;
          break;
      }
      wallet.lastUpdated = new Date();
      await wallet.save();

      // Create transaction record
      const transaction = new Transaction({
        type: "expense",
        category: "Purchase",
        amount: amountPaid,
        source: paymentMethod,
        reference: purchase._id,
        referenceModel: "Purchase",
        description: `Purchase from ${supplierDoc.name} - Invoice: ${supplierInvoiceNo || "N/A"}`,
        notes: notes,
        createdBy: payload.userId,
      });
      await transaction.save();
    }

    return NextResponse.json(
      {
        message: "Purchase created successfully",
        purchase,
        batches: batches.map((b) => ({
          id: b._id,
          quantity: b.quantity,
          unitCostWithTax: b.buyingRate,
          sellingPrice: b.sellingPrice,
          profitPerUnit: b.profitPerUnit,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Purchase creation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const purchases = await Purchase.find()
      .populate("supplier", "name email phone")
      .populate("products.product", "name sku retailPrice")
      .sort({ createdAt: -1 });

    return NextResponse.json({ purchases }, { status: 200 });
  } catch (error) {
    console.error("Purchases fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
