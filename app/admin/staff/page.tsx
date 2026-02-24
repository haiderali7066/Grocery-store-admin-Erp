// app/admin/staff/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Edit, Trash2, Users, CheckCircle,
  Eye, EyeOff, Copy, Check, KeyRound,
} from "lucide-react";
import PermissionGuard from "@/components/admin/PermissionGuard";

interface Staff {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "accountant" | "staff";
  isActive: boolean;
  tempPassword?: string;
  createdAt: string;
}

const rolePermissions: Record<string, string[]> = {
  admin: ["all"],
  manager: ["pos", "orders", "inventory", "staff-management", "reports", "customers", "suppliers", "purchases"],
  accountant: ["reports", "suppliers", "purchases", "tax-reports", "expenses", "wallet", "investment"],
  staff: ["pos", "basic-inventory", "orders"],
};

const roleDescriptions: Record<string, string> = {
  admin: "Full access to all features",
  manager: "Can manage POS, Orders, Inventory, Customers, Suppliers",
  accountant: "Can access Reports, Suppliers, Accounting, Expenses, Investments",
  staff: "Limited access - POS, basic inventory, and orders",
};

// ── Show/hide + copy password ─────────────────────────────────────────────────
function PasswordCell({ password }: { password?: string }) {
  const [visible, setVisible] = useState(false);
  const [copied,  setCopied]  = useState(false);

  if (!password) {
    return (
      <p className="text-xs text-gray-400 italic mt-1">
        Password not recorded — use "Reset Password" below to set one
      </p>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">Password:</span>
      <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded select-all tracking-wide">
        {visible ? password : "•".repeat(Math.min(password.length, 14))}
      </code>
      <button
        onClick={() => setVisible(v => !v)}
        title={visible ? "Hide" : "Show"}
        className="text-gray-400 hover:text-gray-700 transition-colors"
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        className="text-gray-400 hover:text-green-600 transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {copied && <span className="text-xs text-green-600 font-semibold">Copied!</span>}
    </div>
  );
}

// ── Inline password reset ─────────────────────────────────────────────────────
function ResetPasswordRow({
  staffId,
  onReset,
}: {
  staffId: string;
  onReset: (newPassword: string) => void;
}) {
  const [open,   setOpen]   = useState(false);
  const [newPw,  setNewPw]  = useState("");
  const [show,   setShow]   = useState(false);
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    if (!newPw.trim()) return alert("Enter a new password");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPw }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      onReset(newPw);          // update card immediately without refetch
      setOpen(false);
      setNewPw("");
    } catch (e: any) {
      alert(e.message || "Error resetting password");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1.5 transition-colors"
      >
        <KeyRound className="h-3 w-3" /> Reset Password
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={newPw}
          onChange={e => setNewPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleReset()}
          placeholder="New password"
          autoFocus
          className="border rounded-lg px-3 py-1.5 text-sm pr-8 w-48 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      <Button
        size="sm"
        onClick={handleReset}
        disabled={saving || !newPw.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 h-auto"
      >
        {saving ? "Saving…" : "Update"}
      </Button>
      <button
        onClick={() => { setOpen(false); setNewPw(""); }}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function StaffContent() {
  const [staff,      setStaff]      = useState<Staff[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [showFormPw, setShowFormPw] = useState(false);
  const [formData,   setFormData]   = useState({
    name: "", email: "", phone: "",
    role: "staff" as Staff["role"],
    password: "",
  });

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/admin/staff");
      if (res.ok) setStaff((await res.json()).staff);
    } catch (e) {
      console.error("[Staff]:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        editingId ? `/api/admin/staff/${editingId}` : "/api/admin/staff",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      if (res.ok) {
        await fetchStaff();
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: "", email: "", phone: "", role: "staff", password: "" });
      } else {
        alert((await res.json()).message || "Failed to save staff member");
      }
    } catch {
      alert("Error saving staff member");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this staff member?")) return;
    const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    if (res.ok) setStaff(prev => prev.filter(s => s._id !== id));
  };

  const handleEdit = (s: Staff) => {
    setEditingId(s._id);
    setFormData({ name: s.name, email: s.email, phone: s.phone, role: s.role, password: "" });
    setShowForm(true);
  };

  // Called after inline reset succeeds — updates card without re-fetching all staff
  const handlePasswordReset = (staffId: string, newPassword: string) => {
    setStaff(prev =>
      prev.map(s => s._id === staffId ? { ...s, tempPassword: newPassword } : s),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-2">Manage team members and their permissions</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", email: "", phone: "", role: "staff", password: "" });
            setShowForm(v => !v);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Staff Member
        </Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="p-6 border-0 shadow-md">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? "Edit Staff Member" : "Add New Staff Member"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text" placeholder="Full Name" value={formData.name} required
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="email" placeholder="Email" value={formData.email} required
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="tel" placeholder="Phone" value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Password field — required for new, optional for edit */}
            <div className="relative">
              <input
                type={showFormPw ? "text" : "password"}
                placeholder={editingId
                  ? "New password (leave blank to keep current)"
                  : "Password *"}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required={!editingId}
                className="w-full border rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="button"
                onClick={() => setShowFormPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showFormPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Role: {formData.role.toUpperCase()}
              </p>
              <p className="text-sm text-blue-800">{roleDescriptions[formData.role]}</p>
              <p className="text-xs text-blue-700 mt-1">
                <span className="font-medium">Permissions: </span>
                {rolePermissions[formData.role].join(", ")}
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingId ? "Update" : "Create"} Staff Member
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Staff cards */}
      <div className="grid grid-cols-1 gap-4">
        {staff.length > 0 ? staff.map(s => (
          <Card key={s._id} className="p-6 border-0 shadow-md hover:shadow-lg transition">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">

                {/* Name + status */}
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <Users className="h-5 w-5 text-blue-600 shrink-0" />
                  <h3 className="text-lg font-bold text-gray-900">{s.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <p className="text-sm text-gray-600">{s.email}</p>
                {s.phone && <p className="text-sm text-gray-600">{s.phone}</p>}

                {/* Password display */}
                <PasswordCell password={s.tempPassword} />

                {/* Inline reset */}
                <ResetPasswordRow
                  staffId={s._id}
                  onReset={newPw => handlePasswordReset(s._id, newPw)}
                />

                {/* Role + permission pills */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  <div className="bg-purple-50 px-3 py-1 rounded-full text-xs font-medium text-purple-800">
                    {s.role.toUpperCase()}
                  </div>
                  {rolePermissions[s.role].slice(0, 3).map(perm => (
                    <div key={perm} className="bg-blue-50 px-3 py-1 rounded-full text-xs font-medium text-blue-800">
                      {perm}
                    </div>
                  ))}
                  {rolePermissions[s.role].length > 3 && (
                    <div className="bg-gray-50 px-3 py-1 rounded-full text-xs font-medium text-gray-600">
                      +{rolePermissions[s.role].length - 3} more
                    </div>
                  )}
                </div>
              </div>

              {/* Edit / Delete */}
              <div className="flex gap-2 shrink-0">
                <Button onClick={() => handleEdit(s)} variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(s._id)}
                  variant="outline" size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )) : (
          <Card className="p-12 border-0 shadow-md text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No staff members yet</p>
          </Card>
        )}
      </div>

      {/* Permissions reference */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-lg font-bold mb-4">Role Permissions Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(roleDescriptions).map(([role, desc]) => (
            <div key={role} className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2 capitalize">{role}</h3>
              <p className="text-sm text-gray-600 mb-3">{desc}</p>
              <div className="text-xs space-y-1">
                {rolePermissions[role].slice(0, 5).map(perm => (
                  <div key={perm} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-3 w-3 text-green-600" /> {perm}
                  </div>
                ))}
                {rolePermissions[role].length > 5 && (
                  <div className="text-gray-500 text-xs pt-1">
                    +{rolePermissions[role].length - 5} more permissions
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function StaffPage() {
  return (
    <PermissionGuard roles={["admin"]}>
      <StaffContent />
    </PermissionGuard>
  );
}