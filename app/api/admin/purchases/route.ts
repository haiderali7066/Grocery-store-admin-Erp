import { connectDB } from "@/lib/db";
import { Purchase, Product, InventoryBatch, Supplier, Transaction, Wallet } from "@/lib/models/index";
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
    } = body;

    // Validate supplier
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Validate and process products
    const purchaseProducts = [];
    for (const item of products) {
      const productDoc = await Product.findById(item.product);
      if (!productDoc) {
        return NextResponse.json(
          { error: `Product not found: ${item.product}` },
          { status: 404 }
        );
      }

      // Update product stock
      productDoc.stock += item.quantity;
      await productDoc.save();

      // Create inventory batch for FIFO tracking
      const batch = new InventoryBatch({
        product: productDoc._id,
        quantity: item.quantity,
        buyingRate: item.buyingRate,
        status: "active",
      });
      await batch.save();

      purchaseProducts.push({
        product: productDoc._id,
        quantity: item.quantity,
        buyingRate: item.buyingRate,
        batchNumber: batch._id.toString(),
      });
    }

    // Create purchase record
    const purchase = new Purchase({
      supplier: supplierDoc._id,
      supplierInvoiceNo,
      products: purchaseProducts,
      totalAmount: totalAmount || purchaseProducts.reduce((sum, p) => sum + (p.quantity * p.buyingRate), 0),
      paymentMethod,
      notes,
      status: "completed",
      paymentStatus: "completed",
    });

    await purchase.save();

    // Link purchase to batches
    for (const item of purchaseProducts) {
      await InventoryBatch.findByIdAndUpdate(item.batchNumber, {
        purchaseReference: purchase._id,
      });
    }

    // Update wallet based on payment method
    const wallet = await Wallet.findOne() || new Wallet();
    const amountPaid = purchase.totalAmount;

    switch (paymentMethod) {
      case 'cash':
        wallet.cash = (wallet.cash || 0) - amountPaid;
        break;
      case 'bank':
        wallet.bank = (wallet.bank || 0) - amountPaid;
        break;
      case 'easypaisa':
        wallet.easyPaisa = (wallet.easyPaisa || 0) - amountPaid;
        break;
      case 'jazzcash':
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
      description: `Purchase from ${supplierDoc.name} - Invoice: ${supplierInvoiceNo || 'N/A'}`,
      notes: notes,
      createdBy: payload.userId,
    });
    await transaction.save();

    return NextResponse.json(
      {
        message: "Purchase created successfully",
        purchase,
        transaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Purchase creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
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
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}