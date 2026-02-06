'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Printer, Trash2, Plus, Search, DollarSign } from 'lucide-react';

interface POSProduct {
  _id: string;
  name: string;
  retailPrice: number;
  unitSize: number;
  unitType: string;
  stock: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data.products || data || []);
        console.log('[v0] POS Products loaded:', data.products?.length || 0);
      } catch (error) {
        console.error('[v0] Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: POSProduct) => {
    if (product.stock === 0) {
      alert('Product out of stock');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert('Cannot exceed available stock');
          return prev;
        }
        return prev.map((item) =>
          item.productId === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.retailPrice,
          quantity: 1,
          total: product.retailPrice,
        },
      ];
    });
    setSearchTerm('');
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p._id === productId);
    if (product && quantity > product.stock) {
      alert('Cannot exceed available stock');
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              total: quantity * item.price,
            }
          : item
      )
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.17; // 17% GST
  const total = subtotal + tax;
  const change = parseFloat(amountPaid || '0') - total;

  const processBill = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (!amountPaid || parseFloat(amountPaid) < total) {
      alert('Insufficient payment amount');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/pos/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          items: cart,
          subtotal,
          tax,
          total,
          amountPaid: parseFloat(amountPaid),
          change,
          paymentMethod,
        }),
      });

      if (res.ok) {
        const bill = await res.json();
        setLastBill(bill);
        resetBill();
        alert('Bill processed successfully!');
      } else {
        alert('Failed to process bill');
      }
    } catch (error) {
      console.error('[v0] Error processing bill:', error);
      alert('Error processing bill');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetBill = () => {
    setCart([]);
    setCustomerName('');
    setAmountPaid('');
    setPaymentMethod('cash');
  };

  const printBill = () => {
    if (!lastBill) {
      alert('No bill to print');
      return;
    }

    const printContent = `
      <html>
        <head>
          <title>Bill Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; width: 300px; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .items { margin: 20px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total-section { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; margin: 5px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>KHAS PURE FOOD</h2>
            <p>Invoice</p>
          </div>
          
          <div>
            <p><strong>Customer:</strong> ${lastBill.customerName}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Payment:</strong> ${lastBill.paymentMethod.toUpperCase()}</p>
          </div>

          <div class="items">
            ${lastBill.items.map((item: CartItem) => `
              <div class="item">
                <span>${item.name} x${item.quantity}</span>
                <span>Rs ${item.total.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>Rs ${lastBill.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax (17%):</span>
              <span>Rs ${lastBill.tax.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total:</span>
              <span>Rs ${lastBill.total.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Paid:</span>
              <span>Rs ${lastBill.amountPaid.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Change:</span>
              <span>Rs ${lastBill.change.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Bill #${lastBill._id}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-screen">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">POS Billing</h1>
          <p className="text-gray-600">Process sales and generate bills</p>
        </div>

        {/* Search Products */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-gray-500">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-gray-500">No products found</p>
          ) : (
            filteredProducts.map((product) => (
              <Card
                key={product._id}
                className="p-3 cursor-pointer hover:shadow-lg transition border-0"
              >
                <button
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                  className="w-full text-left disabled:opacity-50"
                >
                  <p className="font-semibold text-sm">{product.name}</p>
                  <p className="text-xs text-gray-600">
                    {product.unitSize} {product.unitType}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-green-600">
                      Rs {product.retailPrice}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {product.stock} in stock
                    </span>
                  </div>
                </button>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Cart & Billing Section */}
      <div className="space-y-4">
        <Card className="p-6 border-0 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Current Bill</h2>

          {/* Cart Items */}
          <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Cart is empty</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="bg-gray-50 p-3 rounded flex justify-between items-start"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.productId, parseInt(e.target.value) || 0)
                        }
                        className="w-12 text-center border rounded text-sm"
                      />
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      Rs {item.total.toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">Rs {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (17%):</span>
              <span className="font-semibold">Rs {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-green-600">Rs {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer & Payment Info */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Customer Name</label>
              <Input
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as 'cash' | 'card' | 'online')
                }
                className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Amount Paid (Rs)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="mt-1"
              />
            </div>

            {amountPaid && (
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Change Due</p>
                <p className={`text-lg font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rs {change.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={processBill}
              disabled={isProcessing || cart.length === 0}
              className="flex-1 bg-primary hover:bg-primary/90 rounded-full"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Complete Bill
            </Button>
            <Button
              onClick={resetBill}
              variant="outline"
              className="flex-1 rounded-full bg-transparent"
            >
              Clear
            </Button>
          </div>

          {/* Print Button */}
          {lastBill && (
            <Button
              onClick={printBill}
              className="w-full mt-2 bg-secondary hover:bg-secondary/90 rounded-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Last Receipt
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
