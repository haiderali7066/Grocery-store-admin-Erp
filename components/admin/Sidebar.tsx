// components/admin/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Users,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  Zap,
  RefreshCw,
  Settings as WifiSettings,
  DollarSign,
  TrendingUp,
  Receipt,
  MessageCircle,
  UserCog,
  Truck,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

interface MenuItem {
  label: string;
  icon: any;
  href: string;
  permission?: string;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
    permission: "all",
  },

  // POS & Sales (Staff, Manager, Admin)
  {
    label: "POS Billing",
    icon: Zap,
    href: "/admin/pos",
    permission: "pos",
  },
  {
    label: "POS Reports",
    icon: FileText,
    href: "/admin/pos-reports",
    permission: "pos",
    roles: ["admin", "manager", "accountant"],
  },
  {
    label: "Flash Sale",
    icon: Zap,
    href: "/admin/sale",
    roles: ["admin", "manager"],
  },

  // Inventory & Products (Staff can view, Manager can edit)
  {
    label: "Products",
    icon: Package,
    href: "/admin/products",
    permission: "inventory",
  },
  {
    label: "Categories",
    icon: Tags,
    href: "/admin/categories",
    permission: "inventory",
  },
  {
    label: "Customers",
    icon: Tags,
    href: "/admin/customers",
    permission: "all",
  },
  {
    label: "Inventory",
    icon: BarChart3,
    href: "/admin/inventory",
    permission: "inventory",
  },

  // Orders (Staff, Manager, Admin)
  {
    label: "Orders",
    icon: ShoppingCart,
    href: "/admin/orders",
    permission: "orders",
  },
  {
    label: "Returns & Refunds",
    icon: RefreshCw,
    href: "/admin/refunds",
    roles: ["admin", "manager", "accountant"],
  },

  // Suppliers & Purchases (Accountant, Manager, Admin)
  {
    label: "Suppliers",
    icon: Truck,
    href: "/admin/suppliers",
    permission: "suppliers",
    roles: ["admin", "manager", "accountant"],
  },
  // {
  //   label: "Purchases",
  //   icon: Briefcase,
  //   href: "/admin/purchases",
  //   permission: "purchases",
  //   roles: ["admin", "manager", "accountant"],
  // },

  // Financial (Accountant, Admin)
  {
    label: "Wallet & Finance",
    icon: DollarSign,
    href: "/admin/wallet",
    permission: "wallet",
    roles: ["admin", "accountant"],
  },
  {
    label: "Investment",
    icon: TrendingUp,
    href: "/admin/investment",
    permission: "investment",
    roles: ["admin", "accountant"],
  },
  {
    label: "Expenses",
    icon: Receipt,
    href: "/admin/expenses",
    permission: "expenses",
    roles: ["admin", "manager", "accountant"],
  },

  // Reports (Manager, Accountant, Admin)
  {
    label: "Reports",
    icon: FileText,
    href: "/admin/reports",
    permission: "reports",
    roles: ["admin", "manager", "accountant"],
  },

  // Customer Management (Manager, Admin)
  {
    label: "Reviews",
    icon: MessageCircle,
    href: "/admin/reviews",
    roles: ["admin", "manager"],
  },

  // Staff Management (Admin only)
  {
    label: "Staff",
    icon: UserCog,
    href: "/admin/staff",
    permission: "staff-management",
    roles: ["admin"],
  },

  // System Settings (Admin only)
  {
    label: "FBR Settings",
    icon: WifiSettings,
    href: "/admin/fbr-settings",
    roles: ["admin"],
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/admin/settings",
    roles: ["admin"],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout, user, hasPermission, hasRole } = useAuth();

  const canAccessMenuItem = (item: MenuItem): boolean => {
    // If specific roles are defined, check role
    if (item.roles && !hasRole(item.roles)) {
      return false;
    }

    // If permission is defined, check permission
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }

    return true;
  };

  const filteredMenuItems = menuItems.filter(canAccessMenuItem);

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-800">
        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center font-bold">
          KPF
        </div>
        <div>
          <h1 className="font-bold text-lg">Khas Pure</h1>
          <p className="text-xs text-gray-400">{user?.name}</p>
          <p className="text-[10px] text-green-400 uppercase font-bold">
            {user?.role}
          </p>
        </div>
      </div>

      {/* Menu */}
      <nav className="mt-8 px-3 space-y-2 flex-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
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
