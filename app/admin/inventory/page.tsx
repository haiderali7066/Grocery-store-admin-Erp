'use client';

import React from "react"

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';

interface InventoryItem {
  _id: string;
  name: string;
  stock: number;
  buyingRate: number;
  quantity: number;
  lowStockThreshold: number;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Supplier {
  _id: string;
  name: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    buyingRate: '',
    supplierId: '',
  });
  const [removeData, setRemoveData] = useState({
    productId: '',
    quantity: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/admin/inventory');
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/suppliers');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.quantity || !formData.buyingRate || !formData.supplierId) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [
            {
              product: formData.productId,
              quantity: parseInt(formData.quantity),
              buyingRate: parseFloat(formData.buyingRate),
            },
          ],
          supplier: formData.supplierId,
        }),
      });

      if (response.ok) {
        alert('Stock added successfully');
        setIsAddDialogOpen(false);
        setFormData({ productId: '', quantity: '', buyingRate: '', supplierId: '' });
        fetchInventory();
      } else {
        alert('Failed to add stock');
      }
    } catch (error) {
      console.error('Failed to add stock:', error);
      alert('Error adding stock');
    }
  };

  const handleRemoveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removeData.productId || !removeData.quantity) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/inventory/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: removeData.productId,
          quantity: parseInt(removeData.quantity),
        }),
      });

      if (response.ok) {
        alert('Stock removed successfully');
        setIsRemoveDialogOpen(false);
        setRemoveData({ productId: '', quantity: '' });
        fetchInventory();
      } else {
        alert('Failed to remove stock');
      }
    } catch (error) {
      console.error('Failed to remove stock:', error);
      alert('Error removing stock');
    }
  };

  const lowStockItems = inventory.filter(
    (item) => item.stock <= item.lowStockThreshold
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">Manage stock & FIFO tracking</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-700 hover:bg-green-800 rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Add Stock (Purchase)</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStock} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) =>
                      setFormData({ ...formData, productId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buying Rate (Rs. per unit)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.buyingRate}
                    onChange={(e) =>
                      setFormData({ ...formData, buyingRate: e.target.value })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-green-700 hover:bg-green-800 rounded-full">
                  Add Stock
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full border-red-600 text-red-600 hover:bg-red-50 bg-transparent">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Remove Stock</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRemoveStock} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    value={removeData.productId}
                    onChange={(e) =>
                      setRemoveData({ ...removeData, productId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to Remove
                  </label>
                  <Input
                    type="number"
                    value={removeData.quantity}
                    onChange={(e) =>
                      setRemoveData({ ...removeData, quantity: e.target.value })
                    }
                    placeholder="0"
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full">
                  Remove Stock
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 bg-orange-50 border border-orange-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-900">Low Stock Alert</p>
              <p className="text-sm text-orange-700">
                {lowStockItems.length} products need restocking
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Inventory Table */}
      <Card className="p-6 border-0 shadow-md overflow-x-auto">
        {isLoading ? (
          <p>Loading inventory...</p>
        ) : inventory.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Product
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Stock
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Buying Rate
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr
                  key={item._id}
                  className={`border-b border-gray-100 ${
                    item.stock <= item.lowStockThreshold ? 'bg-orange-50' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-sm">{item.stock}</td>
                  <td className="py-3 px-4 text-sm">
                    Rs. {item.buyingRate.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    {item.stock <= item.lowStockThreshold ? (
                      <span className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        Adequate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-500 py-8">No inventory items</p>
        )}
      </Card>
    </div>
  );
}
