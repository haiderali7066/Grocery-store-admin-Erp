'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Boxes, Tags, Users, FileText, Settings, LogOut, BarChart3, Zap, RefreshCw, Settings as WifiSettings, DollarSign, TrendingUp, Receipt, MessageCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },

  // Financial Management
  { label: "Wallet & Finance", icon: DollarSign, href: "/admin/wallet" },
  { label: "Investment", icon: TrendingUp, href: "/admin/investment" },
  { label: "Expenses", icon: Receipt, href: "/admin/expenses" },

  // Operations
  { label: "Staff", icon: Users, href: "/admin/staff" },
  { label: "Products", icon: Package, href: "/admin/products" },
  { label: "Categories", icon: Tags, href: "/admin/categories" },
  { label: "Suppliers", icon: Users, href: "/admin/suppliers" },

  // Inventory & Orders
  { label: "Inventory", icon: BarChart3, href: "/admin/inventory" },
  { label: "Orders", icon: ShoppingCart, href: "/admin/orders" },
  { label: "Returns & Refunds", icon: RefreshCw, href: "/admin/refunds" },

  // Sales
  { label: "POS Billing", icon: Zap, href: "/admin/pos" },
  { label: "POS Reports", icon: FileText, href: "/admin/pos-reports" },
  
  { label: "Flash Sale ", icon: Zap, href: "/admin/sale" },

  // Customer Management
  { label: "Reviews", icon: MessageCircle, href: "/admin/reviews" },

  // Reports & Analysis
  { label: "Reports", icon: FileText, href: "/admin/reports" },

  // System
  { label: "FBR Settings", icon: WifiSettings, href: "/admin/fbr-settings" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-800">
        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center font-bold">
          KPF
        </div>
        <div>
          <h1 className="font-bold text-lg">Khas Pure</h1>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="mt-8 px-3 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-4 border-t border-gray-800">
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start text-red-400 hover:bg-red-900/20 hover:text-red-300"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
