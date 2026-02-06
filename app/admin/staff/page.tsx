'use client';

import React from "react"

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Users, Lock, CheckCircle } from 'lucide-react';

interface Staff {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'accountant' | 'staff';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

const rolePermissions: Record<string, string[]> = {
  admin: ['all'],
  manager: ['pos', 'orders', 'inventory', 'staff-management'],
  accountant: ['reports', 'suppliers', 'purchases', 'tax-reports'],
  staff: ['pos', 'basic-inventory'],
};

const roleDescriptions: Record<string, string> = {
  admin: 'Full access to all features',
  manager: 'Can manage POS, Orders, Inventory',
  accountant: 'Can access Reports, Suppliers, Accounting',
  staff: 'Limited access - POS and basic inventory',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as const,
    password: '',
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff);
      }
    } catch (error) {
      console.error('[Staff] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/admin/staff/${editingId}` : '/api/admin/staff';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchStaff();
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', email: '', phone: '', role: 'staff', password: '' });
      } else {
        alert('Failed to save staff member');
      }
    } catch (error) {
      console.error('[Staff] Submit error:', error);
      alert('Error saving staff member');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchStaff();
      }
    } catch (error) {
      console.error('[Staff] Delete error:', error);
    }
  };

  const handleEdit = (s: Staff) => {
    setEditingId(s._id);
    setFormData({
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      password: '',
    });
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading staff...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-2">Manage team members and their permissions</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', email: '', phone: '', role: 'staff', password: '' });
            setShowForm(!showForm);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-0 shadow-md">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="border rounded-lg px-4 py-2"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border rounded-lg px-4 py-2"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border rounded-lg px-4 py-2"
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="border rounded-lg px-4 py-2"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {!editingId && (
              <input
                type="password"
                placeholder="Password (for new account)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full border rounded-lg px-4 py-2"
              />
            )}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Role: {formData.role.toUpperCase()}
              </p>
              <p className="text-sm text-blue-800">
                {roleDescriptions[formData.role]}
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <p className="font-medium">Permissions:</p>
                <p>{rolePermissions[formData.role].join(', ')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingId ? 'Update' : 'Create'} Staff Member
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Staff List */}
      <div className="grid grid-cols-1 gap-4">
        {staff.length > 0 ? (
          staff.map((s) => (
            <Card key={s._id} className="p-6 border-0 shadow-md hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">{s.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        s.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{s.email}</p>
                  {s.phone && <p className="text-sm text-gray-600">{s.phone}</p>}
                  <div className="mt-3 flex gap-3 flex-wrap">
                    <div className="bg-purple-50 px-3 py-1 rounded-full text-xs font-medium text-purple-800">
                      {s.role.toUpperCase()}
                    </div>
                    {rolePermissions[s.role].map((perm) => (
                      <div
                        key={perm}
                        className="bg-blue-50 px-3 py-1 rounded-full text-xs font-medium text-blue-800"
                      >
                        {perm}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(s)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(s._id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-12 border-0 shadow-md text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No staff members yet</p>
          </Card>
        )}
      </div>

      {/* Permissions Reference */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-lg font-bold mb-4">Role Permissions Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(roleDescriptions).map(([role, desc]) => (
            <div key={role} className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2 capitalize">{role}</h3>
              <p className="text-sm text-gray-600 mb-3">{desc}</p>
              <div className="text-xs space-y-1">
                {rolePermissions[role].map((perm) => (
                  <div key={perm} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    {perm}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
