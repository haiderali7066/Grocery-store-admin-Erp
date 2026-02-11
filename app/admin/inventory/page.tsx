"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  AlertTriangle,
  Trash2,
  Package,
  Receipt,
  Wallet,
  Percent,
  Hash,
} from "lucide-react";

interface InventoryItem {
  _id: string;
  name: string;
  stock: number;
  buyingRate: number;
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
  buyingRate: string; // Base rate excluding tax
  taxType: "percent" | "fixed"; // New: Toggle between % and Fixed
  taxValue: string; // The amount/percentage
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Purchase Form State
  const [purchaseProducts, setPurchaseProducts] = useState<PurchaseProduct[]>([
    { productId: "", quantity: "", buyingRate: "", taxType: "percent", taxValue: "0" },
  ]);

  const [purchaseData, setPurchaseData] = useState({
    supplierId: "",
    paymentMethod: "cash" as "cash" | "bank" | "cheque" | "easypaisa" | "jazzcash",
    supplierInvoiceNo: "",
    notes: "",
    amountPaid: "0",
  });

  useEffect(() => {
    fetchInventory();
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch("/api/admin/inventory");
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/admin/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const addProductRow = () => {
    setPurchaseProducts([
      ...purchaseProducts,
      { productId: "", quantity: "", buyingRate: "", taxType: "percent", taxValue: "0" },
    ]);
  };

  const removeProductRow = (index: number) => {
    if (purchaseProducts.length > 1) {
      setPurchaseProducts(purchaseProducts.filter((_, i) => i !== index));
    }
  };

  const updateProductRow = (
    index: number,
    field: keyof PurchaseProduct,
    value: string
  ) => {
    const updated = [...purchaseProducts];
    (updated[index] as any)[field] = value;
    setPurchaseProducts(updated);
  };

  // --- New Calculation Logic for Fixed/Percent Tax ---

  const calculateUnitPriceWithTax = (item: PurchaseProduct) => {
    const rate = parseFloat(item.buyingRate) || 0;
    const taxVal = parseFloat(item.taxValue) || 0;

    if (item.taxType === "percent") {
      return rate + (rate * (taxVal / 100));
    } else {
      // Fixed tax is added directly to the unit price
      return rate + taxVal;
    }
  };

  const calculateItemSubtotal = (item: PurchaseProduct) => {
    const qty = parseFloat(item.quantity) || 0;
    const unitPriceWithTax = calculateUnitPriceWithTax(item);
    return qty * unitPriceWithTax;
  };

  const totalBillAmount = purchaseProducts.reduce(
    (total, item) => total + calculateItemSubtotal(item),
    0
  );

  const amountPaid = parseFloat(purchaseData.amountPaid) || 0;
  const balanceDue = totalBillAmount - amountPaid;

  const handleBulkPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!purchaseData.supplierId) {
      alert("Please select a supplier");
      return;
    }

    const validProducts = purchaseProducts.filter(
      (p) => p.productId && p.quantity && p.buyingRate
    );

    if (validProducts.length === 0) {
      alert("Please add at least one valid product");
      return;
    }

    try {
      const response = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: purchaseData.supplierId,
          products: validProducts.map((p) => ({
            product: p.productId,
            quantity: parseInt(p.quantity),
            buyingRate: parseFloat(p.buyingRate), // Original base cost
            taxType: p.taxType,
            taxValue: parseFloat(p.taxValue),
            unitPriceWithTax: calculateUnitPriceWithTax(p), // This is the "Batch Cost" for profit calc
          })),
          paymentMethod: purchaseData.paymentMethod,
          supplierInvoiceNo: purchaseData.supplierInvoiceNo,
          notes: purchaseData.notes,
          totalAmount: totalBillAmount,
          amountPaid: amountPaid,
          balanceDue: balanceDue,
        }),
      });

      if (response.ok) {
        alert("Purchase recorded! New batch created for profit tracking.");
        setIsAddDialogOpen(false);
        setPurchaseProducts([{ productId: "", quantity: "", buyingRate: "", taxType: "percent", taxValue: "0" }]);
        setPurchaseData({
          supplierId: "",
          paymentMethod: "cash",
          supplierInvoiceNo: "",
          notes: "",
          amountPaid: "0",
        });
        fetchInventory();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inventory & Batches</h1>
          <p className="text-gray-500 text-sm">Track unit-wise profit with accurate landing costs.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg px-6">
              <Plus className="h-5 w-5 mr-2" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Receipt className="h-6 w-6 text-blue-600" />
                Create Purchase Order
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleBulkPurchase} className="space-y-6 mt-4">
              {/* Supplier Section */}
              <Card className="p-4 bg-slate-50 border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Supplier *</label>
                  <select
                    value={purchaseData.supplierId}
                    onChange={(e) => setPurchaseData({ ...purchaseData, supplierId: e.target.value })}
                    className="w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">Choose Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Invoice #</label>
                  <Input
                    value={purchaseData.supplierInvoiceNo}
                    onChange={(e) => setPurchaseData({ ...purchaseData, supplierInvoiceNo: e.target.value })}
                    placeholder="e.g. INV-99"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Payment Method</label>
                  <select
                    value={purchaseData.paymentMethod}
                    onChange={(e) => setPurchaseData({ ...purchaseData, paymentMethod: e.target.value as any })}
                    className="w-full p-2 border rounded-md bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="easypaisa">EasyPaisa</option>
                  </select>
                </div>
              </Card>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" /> Purchase Items
                  </h3>
                  <Button type="button" onClick={addProductRow} variant="outline" size="sm" className="text-green-600 border-green-600">
                    <Plus className="h-4 w-4 mr-1" /> Add Product
                  </Button>
                </div>

                <div className="space-y-3">
                  {purchaseProducts.map((item, index) => (
                    <Card key={index} className="p-4 border-l-4 border-l-blue-500 shadow-sm">
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-12 md:col-span-3">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Product</label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateProductRow(index, "productId", e.target.value)}
                            className="w-full mt-1 p-2 border rounded-md text-sm bg-white"
                            required
                          >
                            <option value="">Select...</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3 md:col-span-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Qty</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateProductRow(index, "quantity", e.target.value)}
                            required
                          />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Base Rate</label>
                          <Input
                            type="number"
                            value={item.buyingRate}
                            onChange={(e) => updateProductRow(index, "buyingRate", e.target.value)}
                            required
                          />
                        </div>

                        <div className="col-span-5 md:col-span-3">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Tax Type & Value</label>
                          <div className="flex mt-1">
                            <select
                              value={item.taxType}
                              onChange={(e) => updateProductRow(index, "taxType", e.target.value)}
                              className="p-2 border rounded-l-md bg-slate-50 text-xs font-bold border-r-0"
                            >
                              <option value="percent">%</option>
                              <option value="fixed">Rs</option>
                            </select>
                            <Input
                              type="number"
                              value={item.taxValue}
                              onChange={(e) => updateProductRow(index, "taxValue", e.target.value)}
                              className="rounded-l-none"
                            />
                          </div>
                        </div>

                        <div className="col-span-10 md:col-span-2 bg-blue-50 p-2 rounded border border-blue-100">
                          <label className="text-[9px] uppercase font-bold text-blue-500 block">Landed Cost (Batch)</label>
                          <p className="text-sm font-bold text-blue-700">Rs {calculateUnitPriceWithTax(item).toFixed(2)}</p>
                        </div>

                        <div className="col-span-2 md:col-span-1 text-right">
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeProductRow(index)} className="text-red-400">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <Card className="p-4 border-orange-200 bg-orange-50/50">
                  <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-3">
                    <Wallet className="h-4 w-4" /> Payment
                  </h4>
                  <label className="text-sm font-semibold block mb-1">Amount Paid to Supplier Now</label>
                  <Input
                    type="number"
                    value={purchaseData.amountPaid}
                    onChange={(e) => setPurchaseData({ ...purchaseData, amountPaid: e.target.value })}
                    className="text-lg font-bold bg-white border-orange-300"
                  />
                </Card>

                <Card className="p-6 bg-slate-900 text-white flex flex-col justify-center space-y-2 shadow-xl">
                  <div className="flex justify-between items-center opacity-80 text-sm">
                    <span>Total Bill:</span>
                    <span>Rs {totalBillAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                    <span className="text-lg font-bold">Balance Payable:</span>
                    <span className={`text-3xl font-black ${balanceDue > 0 ? "text-red-400" : "text-green-400"}`}>
                      Rs {Math.abs(balanceDue).toFixed(2)}
                    </span>
                  </div>
                </Card>
              </div>

              <Button type="submit" className="w-full py-6 text-xl bg-green-600 hover:bg-green-700 font-bold shadow-xl">
                Finalize Purchase & Update Batch Costs
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Inventory Display */}
      <Card className="shadow-xl overflow-hidden border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-600">Product Name</th>
                <th className="px-6 py-4 font-bold text-gray-600">Stock Level</th>
                <th className="px-6 py-4 font-bold text-gray-600">Latest Batch Cost</th>
                <th className="px-6 py-4 font-bold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-bold">{item.stock}</span>
                    <span className="text-xs text-gray-400 ml-1">units</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">Rs {item.buyingRate.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      item.stock <= item.lowStockThreshold ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {item.stock <= item.lowStockThreshold ? "Low" : "Healthy"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}