// components/admin/PermissionGuard.tsx
"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  roles?: string[];
  fallback?: React.ReactNode;
}

export default function PermissionGuard({
  children,
  permission,
  roles,
  fallback,
}: PermissionGuardProps) {
  const { user, isLoading, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
        return;
      }

      // Check role-based access
      if (roles && !hasRole(roles)) {
        router.push("/admin");
        return;
      }

      // Check permission-based access
      if (permission && !hasPermission(permission)) {
        router.push("/admin");
        return;
      }
    }
  }, [user, isLoading, permission, roles, hasPermission, hasRole, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
      </div>
    );
  }

  // Check permissions
  if (roles && !hasRole(roles)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You don't have permission to view this page.
            </p>
          </div>
        </div>
      )
    );
  }

  if (permission && !hasPermission(permission)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You don't have permission to view this page.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
