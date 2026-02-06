import { connectDB } from "@/lib/db";
import { POSSale, Product, InventoryBatch } from "@/lib/models/index";
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
      subtotal,
      tax,
      total,
      amountPaid,
      change,
      paymentMethod,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Generate sale number
    const saleNumber = `POS-${Date.now()}`;

    // Process items and update inventory using FIFO
    const saleItems = [];
    let totalCost = 0;

    for (const item of items) {
      const { productId, quantity, price, total: itemTotal } = item;

      // Validate product exists
      const product = await Product.findById(productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${productId}` },
          { status: 404 },
        );
      }

      // Check stock availability
      if (product.stock < quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${quantity}`,
          },
          { status: 400 },
        );
      }

      // Deduct stock using FIFO
      let remainingQty = quantity;
      let costOfGoods = 0;

      const batches = await InventoryBatch.find({
        product: productId,
        status: { $in: ["active", "partial"] },
        quantity: { $gt: 0 },
      }).sort({ createdAt: 1 }); // FIFO - oldest first

      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(batch.quantity, remainingQty);

        // Calculate cost for this batch
        costOfGoods += deductQty * batch.buyingRate;

        // Update batch
        batch.quantity -= deductQty;
        if (batch.quantity === 0) {
          batch.status = "finished";
        } else if (batch.quantity < batch.quantity + deductQty) {
          batch.status = "partial";
        }
        await batch.save();

        remainingQty -= deductQty;
      }

      if (remainingQty > 0) {
        return NextResponse.json(
          {
            error: `Unable to fulfill quantity for ${product.name} from inventory batches`,
          },
          { status: 400 },
        );
      }

      // Update product stock
      product.stock -= quantity;
      await product.save();

      totalCost += costOfGoods;

      saleItems.push({
        product: productId,
        quantity,
        weight: `${product.unitSize} ${product.unitType}`,
        price,
        gst: tax / items.length, // Distribute tax equally
        subtotal: itemTotal,
      });
    }

    // Calculate profit
    const profit = subtotal - totalCost;

    // Create POS sale record
    const posSale = new POSSale({
      saleNumber,
      cashier: payload.userId,
      items: saleItems,
      subtotal,
      gstAmount: tax,
      totalAmount: total,
      paymentMethod: paymentMethod === "online" ? "manual" : paymentMethod,
      paymentStatus: "completed",
      profit,
      costOfGoods: totalCost,
      isFinal: true,
      receiptPrinted: false,
    });

    await posSale.save();

    return NextResponse.json(
      {
        message: "Bill processed successfully",
        _id: posSale._id,
        saleNumber,
        customerName,
        items,
        subtotal,
        tax,
        total,
        amountPaid,
        change,
        paymentMethod,
        profit,
        createdAt: posSale.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POS bill processing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
