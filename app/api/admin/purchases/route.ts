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
    // ... Auth logic ...

    const body = await req.json();
    const {
      supplier,
      products,
      totalAmount,
      amountPaid,
      balanceDue,
      paymentMethod,
    } = body;

    const purchaseProducts = [];

    for (const item of products) {
      const productDoc = await Product.findById(item.product);

      // 1. Update overall stock in Product model
      productDoc.stock += item.quantity;
      // Store this as the latest reference price
      productDoc.lastBuyingRate = item.unitPriceWithTax;
      await productDoc.save();

      // 2. Create the BATCH for Profit Calculation
      // profit = salePrice - batch.buyingRate
      const batch = new InventoryBatch({
        product: productDoc._id,
        quantity: item.quantity,
        remainingQuantity: item.quantity, // Important for FIFO selling
        buyingRate: item.unitPriceWithTax, // The price AFTER tax (Landed Cost)
        baseRate: item.buyingRate, // Price before tax
        taxType: item.taxType, // "percent" or "fixed"
        taxValue: item.taxValue,
        status: "active",
      });
      await batch.save();

      purchaseProducts.push({
        product: productDoc._id,
        quantity: item.quantity,
        buyingRate: item.buyingRate,
        taxType: item.taxType,
        taxValue: item.taxValue,
        unitPriceWithTax: item.unitPriceWithTax,
        batchNumber: batch._id,
      });
    }

    // 3. Create Purchase Record
    const purchase = new Purchase({
      supplier,
      products: purchaseProducts,
      totalAmount,
      amountPaid,
      balanceDue,
      paymentMethod,
      status: "completed",
    });
    await purchase.save();

    // 4. Update Supplier Ledger
    const supplierDoc = await Supplier.findById(supplier);
    supplierDoc.balance = (supplierDoc.balance || 0) + balanceDue;
    await supplierDoc.save();

    // 5. Update Financials (Wallet/Transaction) based on amountPaid
    if (amountPaid > 0) {
      const wallet = (await Wallet.findOne()) || new Wallet();
      const methodMap: Record<string, string> = {
        cash: "cash",
        bank: "bank",
        easypaisa: "easyPaisa",
        jazzcash: "jazzCash",
      };
      const field = methodMap[paymentMethod];
      if (field) wallet[field] -= amountPaid;
      await wallet.save();

      await new Transaction({
        type: "expense",
        category: "Purchase Payment",
        amount: amountPaid,
        source: paymentMethod,
        reference: purchase._id,
        referenceModel: "Purchase",
        description: `Paid Rs.${amountPaid} to ${supplierDoc.name}`,
      }).save();
    }

    return NextResponse.json(
      { message: "Batch created & Inventory updated", purchase },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
