'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email: string;
}

export default function EditSupplierPage() {
  const { id } = useParams();
  const router = useRouter();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSupplier(data.supplier);
        setFormData({ name: data.supplier.name, phone: data.supplier.phone, email: data.supplier.email });
      }
    } catch (error) {
      console.error('Failed to fetch supplier:', error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) router.push('/admin/suppliers');
      else alert('Failed to update supplier');
    } catch (error) {
      console.error(error);
      alert('Error updating supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!supplier) return <p className="text-center py-12">Loading supplier...</p>;

  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Edit Supplier</h2>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Supplier Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              value={formData.email}
              type="email"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-700 hover:bg-blue-800 rounded-full">
              {isSubmitting ? 'Updating...' : 'Update Supplier'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/suppliers')}
              className="flex-1 rounded-full bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
