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
import { Plus, AlertTriangle, Trash2, Package, DollarSign, X } from 'lucide-react';

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
  retailPrice: number;
}

interface Supplier {
  _id: string;
  name: string;
}

interface PurchaseProduct {
  productId: string;
  quantity: string;
  buyingRate: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [purchaseProducts, setPurchaseProducts] = useState<PurchaseProduct[]>([
    { productId: '', quantity: '', buyingRate: '' }
  ]);
  const [purchaseData, setPurchaseData] = useState({
    supplierId: '',
    paymentMethod: 'cash' as 'cash' | 'bank' | 'cheque' | 'easypaisa' | 'jazzcash',
    supplierInvoiceNo: '',
    notes: '',
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

  const addProductRow = () => {
    setPurchaseProducts([...purchaseProducts, { productId: '', quantity: '', buyingRate: '' }]);
  };

  const removeProductRow = (index: number) => {
    if (purchaseProducts.length > 1) {
      setPurchaseProducts(purchaseProducts.filter((_, i) => i !== index));
    }
  };

  const updateProductRow = (index: number, field: keyof PurchaseProduct, value: string) => {
    const updated = [...purchaseProducts];
    updated[index][field] = value;
    setPurchaseProducts(updated);
  };

  const calculateTotal = () => {
    return purchaseProducts.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.buyingRate) || 0;
      return total + (quantity * rate);
    }, 0);
  };

  const handleBulkPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!purchaseData.supplierId) {
      alert('Please select a supplier');
      return;
    }

    const validProducts = purchaseProducts.filter(
      p => p.productId && p.quantity && p.buyingRate
    );

    if (validProducts.length === 0) {
      alert('Please add at least one product with quantity and buying rate');
      return;
    }

    try {
      const response = await fetch('/api/admin/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: purchaseData.supplierId,
          products: validProducts.map(p => ({
            product: p.productId,
            quantity: parseInt(p.quantity),
            buyingRate: parseFloat(p.buyingRate),
          })),
          paymentMethod: purchaseData.paymentMethod,
          supplierInvoiceNo: purchaseData.supplierInvoiceNo,
          notes: purchaseData.notes,
          totalAmount: calculateTotal(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Purchase created successfully! Total: Rs ${calculateTotal().toFixed(2)}`);
        setIsAddDialogOpen(false);
        setPurchaseProducts([{ productId: '', quantity: '', buyingRate: '' }]);
        setPurchaseData({
          supplierId: '',
          paymentMethod: 'cash',
          supplierInvoiceNo: '',
          notes: '',
        });
        fetchInventory();
      } else {
        alert(`Failed to create purchase: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create purchase:', error);
      alert('Error creating purchase. Check console for details.');
    }
  };

  const lowStockItems = inventory.filter(
    (item) => item.stock <= item.lowStockThreshold
  );

  const totalPurchaseAmount = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Bulk purchase, stock tracking & FIFO batches</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBulkPurchase} className="space-y-6">
              {/* Supplier Selection */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Supplier *
                    </label>
                    <select
                      value={purchaseData.supplierId}
                      onChange={(e) =>
                        setPurchaseData({ ...purchaseData, supplierId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Invoice Number
                    </label>
                    <Input
                      value={purchaseData.supplierInvoiceNo}
                      onChange={(e) =>
                        setPurchaseData({ ...purchaseData, supplierInvoiceNo: e.target.value })
                      }
                      placeholder="INV-001"
                    />
                  </div>
                </div>
              </Card>

              {/* Products Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    Products
                  </h3>
                  <Button
                    type="button"
                    onClick={addProductRow}
                    variant="outline"
                    size="sm"
                    className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Product
                  </Button>
                </div>

                <div className="space-y-3">
                  {purchaseProducts.map((item, index) => (
                    <Card key={index} className="p-4 border-2 border-gray-200">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Product *
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateProductRow(index, 'productId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name} ({p.sku}) - Rs {p.retailPrice}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Quantity *
                          </label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateProductRow(index, 'quantity', e.target.value)}
                            placeholder="0"
                            className="text-sm"
                            required
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Buying Rate (Rs) *
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.buyingRate}
                            onChange={(e) => updateProductRow(index, 'buyingRate', e.target.value)}
                            placeholder="0.00"
                            className="text-sm"
                            required
                          />
                        </div>

                        <div className="col-span-1">
                          {purchaseProducts.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProductRow(index)}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {item.quantity && item.buyingRate && (
                        <div className="mt-2 text-right">
                          <span className="text-sm font-semibold text-gray-700">
                            Subtotal: Rs {(parseFloat(item.quantity) * parseFloat(item.buyingRate)).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      value={purchaseData.paymentMethod}
                      onChange={(e) =>
                        setPurchaseData({ ...purchaseData, paymentMethod: e.target.value as any })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <Input
                      value={purchaseData.notes}
                      onChange={(e) =>
                        setPurchaseData({ ...purchaseData, notes: e.target.value })
                      }
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </Card>

              {/* Total Amount */}
              <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-700">Total Purchase Amount:</span>
                  <span className="text-3xl font-bold text-green-600">
                    Rs {totalPurchaseAmount.toFixed(2)}
                  </span>
                </div>
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold shadow-lg"
              >
                Create Purchase Order
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 bg-orange-50 border-2 border-orange-300 shadow-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-bold text-orange-900 text-lg">Low Stock Alert</p>
              <p className="text-sm text-orange-700">
                {lowStockItems.length} products need immediate restocking
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Inventory Table */}
      <Card className="p-6 border-0 shadow-lg">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading inventory...</p>
          </div>
        ) : inventory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-4 px-4 font-bold text-gray-700">Product</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-700">Current Stock</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-700">Avg Buying Rate</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr
                    key={item._id}
                    className={`border-b border-gray-200 hover:bg-gray-50 transition ${
                      item.stock <= item.lowStockThreshold ? 'bg-orange-50' : ''
                    }`}
                  >
                    <td className="py-4 px-4 font-semibold text-gray-900">{item.name}</td>
                    <td className="py-4 px-4 text-lg font-bold text-gray-700">{item.stock}</td>
                    <td className="py-4 px-4 text-gray-700">Rs {item.buyingRate.toFixed(2)}</td>
                    <td className="py-4 px-4">
                      {item.stock <= item.lowStockThreshold ? (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                          <AlertTriangle className="h-4 w-4" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                          ✓ Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No inventory items found</p>
          </div>
        )}
      </Card>
    </div>
  );
}