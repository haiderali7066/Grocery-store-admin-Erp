"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Link as LinkIcon,
  Plus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalSales: number | null;
  totalOrders: number | null;
  totalProfit: number | null;
  pendingOrders: number | null;
  lowStockProducts: Array<{ name: string; stock: number; threshold: number }>;
  monthlyData: Array<{ month: string; sales: number; profit: number }>;
  dailyData: Array<{ date: string; sales: number; profit: number }>;
  gstCollected: number | null;
  gstLiability: number | null;
  posRevenue: number | null;
  onlineRevenue: number | null;
  pendingPayments: number | null;
  fbrStatus: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<
    "today" | "week" | "month" | "custom"
  >("month");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/dashboard");
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  // Safe fallback helper for numbers
  const safeNumber = (num: number | null | undefined) =>
    (num ?? 0).toLocaleString();

  const stats_data = stats || {
    totalSales: 0,
    totalOrders: 0,
    totalProfit: 0,
    pendingOrders: 0,
    lowStockProducts: [],
    monthlyData: [],
    dailyData: [],
    gstCollected: 0,
    gstLiability: 0,
    posRevenue: 0,
    onlineRevenue: 0,
    pendingPayments: 0,
    fbrStatus: "unknown",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's your store overview.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Sales</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                Rs. {safeNumber(stats_data.totalSales)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats_data.totalOrders ?? 0}
              </p>
            </div>
            <ShoppingCart className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Profit</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                Rs. {safeNumber(stats_data.totalProfit)}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Pending Orders
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats_data.pendingOrders ?? 0}
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-orange-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">GST Collected</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                Rs. {safeNumber(stats_data.gstCollected)}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Low Stock Items
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats_data.lowStockProducts.length}
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Pending Payments
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats_data.pendingPayments ?? 0}
              </p>
            </div>
            <ShoppingCart className="h-12 w-12 text-amber-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">POS Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                Rs. {safeNumber(stats_data.posRevenue)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Online Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                Rs. {safeNumber(stats_data.onlineRevenue)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Charts & other sections remain the same */}
      {/* ... just wrap all numbers in safeNumber() where you call toLocaleString */}
    </div>
  );
}
