import { connectDB } from "@/lib/db";
import {
  POSSale,
  Product,
  InventoryBatch,
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
    if (!payload) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerName,
      items,
      billDiscountType,
      billDiscountValue,
      billDiscountAmount: clientDiscountAmount,
      paymentMethod,
      amountPaid,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Generate sale number
    const lastSale = await POSSale.findOne().sort({ createdAt: -1 });
    const saleNumber = lastSale
      ? `SALE-${(parseInt(lastSale.saleNumber.split("-")[1]) + 1).toString().padStart(6, "0")}`
      : "SALE-000001";

    const processedItems = [];
    let totalCostOfGoods = 0;

    // Process each item with FIFO batch deduction
    for (const cartItem of items) {
      const product = await Product.findById(cartItem.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${cartItem.productId}` },
          { status: 404 },
        );
      }

      if (product.stock < cartItem.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 },
        );
      }

      // Per-item pricing: price × qty + tax (no per-item discount)
      const basePrice = cartItem.price * cartItem.quantity;
      const taxAmount = basePrice * (cartItem.taxRate / 100);
      const itemTotal = basePrice + taxAmount;

      // FIFO: Get batches for this product (oldest first)
      const batches = await InventoryBatch.find({
        product: product._id,
        status: { $in: ["active", "partial"] },
        remainingQuantity: { $gt: 0 },
      }).sort({ createdAt: 1 });

      if (batches.length === 0) {
        return NextResponse.json(
          { error: `No inventory batches found for ${product.name}` },
          { status: 400 },
        );
      }

      let remainingQty = cartItem.quantity;
      let totalCost = 0;
      const usedBatches = [];

      // Deduct from batches (FIFO)
      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const qtyFromBatch = Math.min(remainingQty, batch.remainingQuantity);
        const batchCost = batch.buyingRate * qtyFromBatch;

        totalCost += batchCost;
        batch.remainingQuantity -= qtyFromBatch;
        remainingQty -= qtyFromBatch;

        if (batch.remainingQuantity === 0) {
          batch.status = "finished";
        } else if (batch.remainingQuantity < batch.quantity) {
          batch.status = "partial";
        }

        await batch.save();
        usedBatches.push({
          batchId: batch._id,
          quantity: qtyFromBatch,
          costPrice: batch.buyingRate,
        });
      }

      if (remainingQty > 0) {
        return NextResponse.json(
          { error: `Insufficient inventory batches for ${product.name}` },
          { status: 400 },
        );
      }

      // Update product stock
      product.stock -= cartItem.quantity;
      await product.save();

      const itemCostPrice = totalCost / cartItem.quantity;
      totalCostOfGoods += totalCost;

      processedItems.push({
        product: product._id,
        name: product.name,
        quantity: cartItem.quantity,
        price: cartItem.price,
        discountType: "percentage",
        discountValue: 0,
        discountAmount: 0,
        taxRate: cartItem.taxRate,
        taxAmount: taxAmount,
        total: itemTotal,
        costPrice: itemCostPrice,
        batchId: usedBatches[0]?.batchId,
      });
    }

    // Calculate totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const totalTax = processedItems.reduce(
      (sum, item) => sum + item.taxAmount,
      0,
    );
    const subtotalWithTax = subtotal + totalTax;

    // Apply bill-level discount (server-side recalculation for safety)
    const discountValue = parseFloat(billDiscountValue) || 0;
    const billDiscountAmountServer =
      billDiscountType === "percentage"
        ? subtotalWithTax * (discountValue / 100)
        : Math.min(discountValue, subtotalWithTax);

    const total = Math.max(0, subtotalWithTax - billDiscountAmountServer);
    const change = amountPaid - total;

    // Profit: total revenue minus cost of goods minus discount
    const totalProfit = total - totalCostOfGoods;

    // Create POS Sale
    const posSale = new POSSale({
      saleNumber,
      customerName: customerName || "Walk-in Customer",
      cashier: payload.userId,
      items: processedItems,
      subtotal,
      discount: billDiscountAmountServer,
      tax: totalTax,
      gstAmount: totalTax,
      totalAmount: total,
      total,
      amountPaid,
      change,
      paymentMethod,
      paymentStatus: "completed",
      profit: totalProfit,
      costOfGoods: totalCostOfGoods,
      isFinal: true,
      receiptPrinted: false,
    });

    await posSale.save();

    // Update wallet
    let wallet = await Wallet.findOne();
    if (!wallet) {
      wallet = new Wallet();
    }

    switch (paymentMethod) {
      case "cash":
        wallet.cash = (wallet.cash || 0) + amountPaid;
        break;
      case "card":
        wallet.card = (wallet.card || 0) + amountPaid;
        break;
    }
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Create transaction
    const transaction = new Transaction({
      type: "income",
      category: "POS Sale",
      amount: total,
      source: paymentMethod,
      reference: posSale._id,
      referenceModel: "POSSale",
      description: `POS Sale ${saleNumber} - ${customerName || "Walk-in Customer"}`,
      createdBy: payload.userId,
    });
    await transaction.save();

    return NextResponse.json(
      {
        message: "Sale completed successfully",
        saleNumber: posSale.saleNumber,
        customerName: posSale.customerName,
        items: processedItems,
        subtotal,
        discount: billDiscountAmountServer,
        tax: totalTax,
        total,
        amountPaid,
        change,
        paymentMethod,
        profit: totalProfit,
        costOfGoods: totalCostOfGoods,
        createdAt: posSale.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POS bill error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}