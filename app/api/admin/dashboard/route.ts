import { connectDB } from "@/lib/db";
import { Order, Product, POSSale, FBRConfig, User } from "@/lib/models/index";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get("cookie") || "");
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (
      !payload ||
      !["admin", "staff", "manager", "accountant"].includes(payload.role)
    )
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // ── Date range ──────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? "month";

    const now = new Date();
    let rangeStart: Date;
    if (range === "today") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "week") {
      rangeStart = new Date(now);
      rangeStart.setDate(now.getDate() - 7);
    } else {
      // month (default)
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // ── Fetch all data in parallel ───────────────────────────
    const [onlineOrders, posSales, products, fbrConfig] = await Promise.all([
      Order.find({ createdAt: { $gte: rangeStart } }).lean(),
      POSSale.find({ createdAt: { $gte: rangeStart } }).lean(),
      Product.find().lean(),
      FBRConfig.findOne().lean(),
    ]);

    // ── Online order stats ───────────────────────────────────
    const onlineRevenue = onlineOrders.reduce(
      (sum, o) => sum + (o.total ?? 0),
      0,
    );
    const onlineGst = onlineOrders.reduce(
      (sum, o) => sum + (o.gstAmount ?? 0),
      0,
    );

    // ── POS sale stats ───────────────────────────────────────
    const posRevenue = posSales.reduce(
      (sum, s) => sum + (s.totalAmount ?? s.total ?? 0),
      0,
    );
    const posGst = posSales.reduce(
      (sum, s) => sum + (s.gstAmount ?? s.tax ?? 0),
      0,
    );

    // ── Combined totals ──────────────────────────────────────
    const totalSales = onlineRevenue + posRevenue;
    const gstCollected = onlineGst + posGst;

    // ── Order counts ─────────────────────────────────────────
    const totalOrders = onlineOrders.length + posSales.length;
    const posOrders = posSales.length;
    const onlineOrders_count = onlineOrders.length;

    // Online order status breakdown
    const approvedOrders = onlineOrders.filter(
      (o) => o.paymentStatus === "verified" && o.orderStatus === "processing",
    ).length;

    const deliveredOrders = onlineOrders.filter(
      (o) => o.orderStatus === "delivered",
    ).length;

    const pendingOrders = onlineOrders.filter(
      (o) =>
        o.orderStatus === "pending" ||
        (o.paymentStatus === "pending" && o.orderStatus !== "cancelled"),
    ).length;

    const cancelledOrders = onlineOrders.filter(
      (o) => o.orderStatus === "cancelled",
    ).length;

    // ── Pending payments (unverified bank/easypaisa/jazzcash) ─
    const pendingPayments = onlineOrders.filter(
      (o) => o.paymentStatus === "pending",
    ).length;

    // ── Low stock ─────────────────────────────────────────────
    const lowStockProducts = products
      .filter((p) => p.stock <= (p.lowStockThreshold ?? 10))
      .map((p) => ({
        name: p.name,
        stock: p.stock ?? 0,
        threshold: p.lowStockThreshold ?? 10,
      }))
      .sort((a, b) => a.stock - b.stock);

    // ── Monthly data (last 6 months) ─────────────────────────
    const [allOrders, allPosSales] = await Promise.all([
      Order.find().lean(),
      POSSale.find().lean(),
    ]);

    const monthlyMap: Record<
      string,
      { month: string; sales: number; orders: number; index: number }
    > = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap[key] = {
        month: d.toLocaleString("default", { month: "short" }),
        sales: 0,
        orders: 0,
        index: 5 - i,
      };
    }

    const addToMonth = (date: Date, sales: number) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].sales += sales;
        monthlyMap[key].orders += 1;
      }
    };

    allOrders.forEach((o) => {
      addToMonth(new Date(o.createdAt), o.total ?? 0);
    });
    allPosSales.forEach((s) => {
      addToMonth(new Date(s.createdAt), s.totalAmount ?? s.total ?? 0);
    });

    const monthlyData = Object.values(monthlyMap)
      .sort((a, b) => a.index - b.index)
      .map(({ month, sales, orders }) => ({ month, sales, orders }));

    // ── Daily data (last 7 days) ─────────────────────────────
    const dailyMap: Record<
      string,
      { date: string; sales: number; orders: number }
    > = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = {
        date: d.toLocaleDateString("en-PK", {
          weekday: "short",
          day: "numeric",
        }),
        sales: 0,
        orders: 0,
      };
    }

    [...allOrders, ...allPosSales].forEach((entry) => {
      const d = new Date(entry.createdAt);
      const key = d.toISOString().slice(0, 10);

      if (dailyMap[key]) {
        dailyMap[key].sales +=
          (entry as any).total ?? (entry as any).totalAmount ?? 0;
        dailyMap[key].orders += 1;
      }
    });

    const dailyData = Object.values(dailyMap);

    // ── FBR status ───────────────────────────────────────────
    const fbrStatus = fbrConfig?.isActive ? "active" : "inactive";

    // ── Total customers (unique users from online orders) ────
    const uniqueCustomers = new Set(
      allOrders.map((o) => o.user?.toString()).filter(Boolean),
    );
    const totalCustomers = uniqueCustomers.size;

    return NextResponse.json(
      {
        stats: {
          totalSales,
          totalOrders,
          approvedOrders,
          deliveredOrders,
          pendingOrders,
          cancelledOrders,
          lowStockProducts,
          monthlyData,
          dailyData,
          gstCollected,
          posRevenue,
          posOrders,
          onlineRevenue,
          onlineOrders: onlineOrders_count,
          pendingPayments,
          fbrStatus,
          totalCustomers,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
