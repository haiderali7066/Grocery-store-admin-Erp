
// app/api/admin/orders/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order, POSSale } from "@/lib/models/index";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !["admin", "manager", "staff"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Order number is required" },
        { status: 400 }
      );
    }

    // Search in both Orders and POSSales
    let orderData = null;
    let orderType = null;

    // Try to find in Orders first
    const order = await Order.findOne({ orderNumber })
      .populate("items.product", "name retailPrice unitSize unitType")
      .lean();

    if (order) {
      orderData = {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        subtotal: order.subtotal,
        gstAmount: order.gstAmount,
        shippingCost: order.shippingCost,
        paymentMethod: order.paymentMethod,
        items: order.items.map((item: any) => ({
          productId: item.product?._id,
          name: item.product?.name || "Deleted Product",
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal || item.price * item.quantity,
        })),
        createdAt: order.createdAt,
      };
      orderType = "online";
    } else {
      // Try POSSale
      const posSale = await POSSale.findOne({ saleNumber: orderNumber })
        .populate("items.product", "name retailPrice")
        .lean();

      if (posSale) {
        orderData = {
          _id: posSale._id,
          orderNumber: posSale.saleNumber,
          total: posSale.total || posSale.totalAmount,
          subtotal: posSale.subtotal,
          gstAmount: posSale.gstAmount || posSale.tax,
          shippingCost: 0,
          paymentMethod: posSale.paymentMethod,
          items: posSale.items.map((item: any) => ({
            productId: item.product?._id,
            name: item.name || item.product?.name || "Unknown",
            quantity: item.quantity,
            price: item.price,
            subtotal: item.total || item.price * item.quantity,
            costPrice: item.costPrice,
          })),
          createdAt: posSale.createdAt,
        };
        orderType = "pos";
      }
    }

    if (!orderData) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        order: orderData,
        orderType,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Order search error:", error);
    return NextResponse.json(
      { error: "Failed to search order" },
      { status: 500 }
    );
  }
}