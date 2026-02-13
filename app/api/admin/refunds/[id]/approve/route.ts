import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  Refund,
  Order,
  POSSale,
  Product,
  InventoryBatch,
  Wallet,
  Transaction,
} from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { approvalAmount, notes } = body;

    const refund = await Refund.findById(id).populate("order");
    if (!refund) {
      return NextResponse.json(
        { error: "Refund request not found" },
        { status: 404 },
      );
    }

    if (refund.status !== "pending") {
      return NextResponse.json(
        { error: "Refund already processed" },
        { status: 400 },
      );
    }

    let items = [];
    let orderRef = null;
    let paymentMethod = "cash";

    // Determine if it's an online order or POS sale
    if (refund.order) {
      // Online order
      const order = refund.order as any;
      items = order.items;
      orderRef = order._id;
      paymentMethod = order.paymentMethod || "cash";
    } else if (refund.orderNumber) {
      // Try to find POS sale by sale number
      const posSale = await POSSale.findOne({
        saleNumber: refund.orderNumber,
      }).populate("items.product");

      if (posSale) {
        items = posSale.items;
        orderRef = posSale._id;
        paymentMethod = posSale.paymentMethod || "cash";
      } else {
        // If no POS sale found, we can't restock automatically
        // Just process the refund without restocking
        console.warn(
          `No POS sale found for order number: ${refund.orderNumber}`,
        );
      }
    }

    // Restock items using FIFO batches
    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.product) continue;

        const productId =
          typeof item.product === "object" ? item.product._id : item.product;
        const product = await Product.findById(productId);
        if (!product) continue;

        const quantity = item.quantity;
        const costPrice = item.costPrice || item.price || 0;

        // Create a new inventory batch for returned items
        const batch = new InventoryBatch({
          product: product._id,
          quantity: quantity,
          remainingQuantity: quantity,
          buyingRate: costPrice, // Use cost price as buying rate
          baseRate: costPrice,
          taxValue: 0,
          taxType: "percent",
          freightPerUnit: 0,
          sellingPrice: product.retailPrice || costPrice * 1.2,
          profitPerUnit: (product.retailPrice || costPrice * 1.2) - costPrice,
          status: "active",
        });

        await batch.save();

        // Increase product stock
        product.stock += quantity;
        await product.save();
      }
    }

    // Calculate refund amount
    const finalRefundAmount =
      parseFloat(approvalAmount) || refund.requestedAmount;

    // Update refund record
    refund.status = "completed";
    refund.approvedBy = payload.userId;
    refund.approvedAt = new Date();
    refund.refundedAmount = finalRefundAmount;
    refund.notes = notes || "Approved and restocked";
    await refund.save();

    // Update order status if it's an online order
    if (refund.order) {
      const order = await Order.findById(refund.order);
      if (order) {
        order.orderStatus = "cancelled";
        await order.save();
      }
    }

    // Update wallet - deduct the refunded amount
    let wallet = await Wallet.findOne();
    if (!wallet) {
      wallet = new Wallet();
    }

    const walletField =
      paymentMethod === "bank"
        ? "bank"
        : paymentMethod === "easypaisa"
          ? "easyPaisa"
          : paymentMethod === "jazzcash"
            ? "jazzCash"
            : "cash";

    wallet[walletField] = (wallet[walletField] || 0) - finalRefundAmount;
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Create transaction record
    const transaction = new Transaction({
      type: "expense",
      category: "Refund",
      amount: finalRefundAmount,
      source: paymentMethod,
      reference: refund._id,
      referenceModel: "Refund",
      description: `Refund for ${refund.returnType === "online" ? "online order" : "POS sale"} ${refund.order?.orderNumber || refund.orderNumber}`,
      notes: notes,
      createdBy: payload.userId,
    });
    await transaction.save();

    return NextResponse.json(
      {
        success: true,
        message: "Refund approved and items restocked",
        refund,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Refund approval error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to approve refund",
      },
      { status: 500 },
    );
  }
}
