"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Printer,
  Trash2,
  Search,
  DollarSign,
  CheckCircle,
  ShoppingCart,
  Package,
  Minus,
  Plus,
  X,
  Barcode,
  User,
  CreditCard,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";

interface POSProduct {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  unitSize: number;
  unitType: string;
  stock: number;
  mainImage?: string;
  discount?: number;
  discountType?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "online"
  >("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  const [showQuickPay, setShowQuickPay] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      const mappedProducts = (data.products || []).map((p: any) => ({
        ...p,
        mainImage: p.mainImage || "/placeholder.png",
      }));
      setProducts(mappedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Barcode scanner handling
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (barcodeBuffer.trim() === "") return;

        const product = products.find((p) => p.sku === barcodeBuffer.trim());
        if (product) {
          addToCart(product);
          setHighlightedSku(product.sku);
          setTimeout(() => setHighlightedSku(null), 800);
        } else {
          alert(`Product with SKU ${barcodeBuffer} not found`);
        }
        setBarcodeBuffer("");
      } else {
        setBarcodeBuffer((prev) => prev + e.key);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [barcodeBuffer, products]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const addToCart = (product: POSProduct) => {
    if (product.stock === 0) {
      alert("Product out of stock");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert("Cannot exceed available stock");
          return prev;
        }
        return prev.map((item) =>
          item.productId === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item,
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
    setSearchTerm("");
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
      alert("Cannot exceed available stock");
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity, total: quantity * item.price }
          : item,
      ),
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.17;
  const total = subtotal + tax;
  const change = parseFloat(amountPaid || "0") - total;

  const processBill = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (!amountPaid || parseFloat(amountPaid) < total)
      return alert("Please enter payment amount (must be >= total)");

    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/pos/bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const data = await res.json();
      if (res.ok) {
        setLastBill(data);
        setShowReceipt(true);
        fetchProducts();
      } else {
        alert(`Failed to process bill: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error processing bill:", error);
      alert("Error processing bill");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetBill = () => {
    setCart([]);
    setCustomerName("Walk-in Customer");
    setAmountPaid("");
    setPaymentMethod("cash");
    setShowReceipt(false);
    setShowQuickPay(false);
  };

  const printBill = () => {
    if (!lastBill) return alert("No bill to print");

    const printContent = `
      <html>
        <head>
          <title>Bill Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; width: 300px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .items { margin: 20px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; }
            .total-section { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; margin: 5px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>KHAS PURE FOOD</h2>
            <p>Sale Receipt</p>
            <p style="font-size: 12px;">Sale #${lastBill.saleNumber}</p>
          </div>
          <div style="font-size: 12px; margin-bottom: 10px;">
            <p><strong>Customer:</strong> ${lastBill.customerName}</p>
            <p><strong>Date:</strong> ${new Date(lastBill.createdAt).toLocaleString()}</p>
            <p><strong>Payment:</strong> ${lastBill.paymentMethod.toUpperCase()}</p>
          </div>
          <div class="items">
            ${lastBill.items
              .map(
                (item: CartItem) => `
              <div class="item">
                <span>${item.name} x${item.quantity}</span>
                <span>Rs ${item.total.toFixed(2)}</span>
              </div>
            `,
              )
              .join("")}
          </div>
          <div class="total-section">
            <div class="total-row" style="font-weight: normal;">
              <span>Subtotal:</span>
              <span>Rs ${lastBill.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row" style="font-weight: normal;">
              <span>Tax (17%):</span>
              <span>Rs ${lastBill.tax.toFixed(2)}</span>
            </div>
            <div class="total-row" style="font-size: 16px;">
              <span>TOTAL:</span>
              <span>Rs ${lastBill.total.toFixed(2)}</span>
            </div>
            <div class="total-row" style="font-weight: normal;">
              <span>Paid:</span>
              <span>Rs ${lastBill.amountPaid.toFixed(2)}</span>
            </div>
            <div class="total-row" style="font-weight: normal;">
              <span>Change:</span>
              <span>Rs ${lastBill.change.toFixed(2)}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Visit us again!</p>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open("", "", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const quickPayAmount = (amount: number) => {
    setAmountPaid(amount.toString());
  };

  // Receipt Screen
  if (showReceipt && lastBill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 shadow-2xl border-0 bg-white">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-4 rounded-full shadow-lg">
                <CheckCircle className="h-16 w-16 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Payment Successful!
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Sale #{lastBill.saleNumber}
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Subtotal
                </span>
                <span className="font-semibold">
                  Rs {lastBill.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Tax (17%)</span>
                <span className="font-semibold">
                  Rs {lastBill.tax.toFixed(2)}
                </span>
              </div>
              <div className="border-t-2 border-dashed border-gray-300 pt-3 flex justify-between text-2xl font-bold">
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Total
                </span>
                <span className="text-emerald-600">
                  Rs {lastBill.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 pt-2">
                <span>Amount Paid</span>
                <span className="font-semibold">
                  Rs {lastBill.amountPaid.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-blue-600">
                <span>Change Due</span>
                <span>Rs {lastBill.change.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={printBill}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg h-12 text-lg"
            >
              <Printer className="h-5 w-5 mr-2" />
              Print Receipt
            </Button>
            <Button
              onClick={resetBill}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg h-12 text-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Sale
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                  <ShoppingCart className="h-8 w-8 text-white" />
                </div>
                Point of Sale
              </h1>
              <p className="text-gray-600 mt-1 ml-1">
                Fast & efficient billing system
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white px-4 py-2 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <Barcode className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">Scanner Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search products by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg border-2 border-blue-200 focus:border-blue-500 rounded-xl shadow-sm"
              />
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 pb-4">
              {loading ? (
                <div className="col-span-full flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No products found</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <Card
                    key={product._id}
                    className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 ${
                      highlightedSku === product.sku
                        ? "border-blue-500 shadow-xl scale-105"
                        : "border-transparent hover:border-blue-300"
                    }`}
                    onClick={() => product.stock > 0 && addToCart(product)}
                  >
                    <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      <Image
                        src={product.mainImage || "/placeholder.png"}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-bold text-sm bg-red-500 px-3 py-1 rounded-full">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="font-semibold text-sm line-clamp-2 text-gray-800 mb-1">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {product.unitSize} {product.unitType} • SKU:{" "}
                        {product.sku}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                          Rs {product.retailPrice}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            product.stock > 10
                              ? "bg-emerald-100 text-emerald-700"
                              : product.stock > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.stock} left
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Cart & Checkout Section */}
          <div className="space-y-4">
            <Card className="bg-white shadow-2xl border-0 rounded-2xl overflow-hidden">
              {/* Cart Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Current Order ({cart.length} items)
                </h2>
              </div>

              <div className="p-4">
                {/* Cart Items */}
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">Cart is empty</p>
                      <p className="text-gray-300 text-sm mt-1">
                        Scan or click products to add
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.productId}
                        className="bg-gradient-to-br from-gray-50 to-blue-50 p-3 rounded-xl border border-blue-100"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-sm text-gray-800 flex-1">
                            {item.name}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-red-500 hover:text-red-700 ml-2 hover:bg-red-50 rounded p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity - 1,
                                )
                              }
                              className="bg-white border border-gray-300 p-1.5 rounded-lg hover:bg-gray-50 shadow-sm"
                            >
                              <Minus className="h-3 w-3 text-gray-600" />
                            </button>
                            <span className="w-12 text-center font-bold text-gray-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                )
                              }
                              className="bg-white border border-gray-300 p-1.5 rounded-lg hover:bg-gray-50 shadow-sm"
                            >
                              <Plus className="h-3 w-3 text-gray-600" />
                            </button>
                          </div>
                          <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Rs {item.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Totals */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 space-y-2 mb-4 border border-indigo-100">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      Rs {subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax (17%):</span>
                    <span className="font-semibold">Rs {tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-indigo-200 pt-2 flex justify-between text-2xl font-bold">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Total:
                    </span>
                    <span className="text-indigo-600">
                      Rs {total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Customer & Payment */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-500" />
                      Customer Name
                    </label>
                    <Input
                      placeholder="Walk-in Customer"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="border-2 border-gray-200 focus:border-blue-400 rounded-lg h-11"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["cash", "card", "online"].map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method as any)}
                          className={`p-3 rounded-lg border-2 font-medium transition-all ${
                            paymentMethod === method
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600 shadow-lg"
                              : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                      Amount Paid (Rs)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="border-2 border-gray-200 focus:border-blue-400 rounded-lg h-11 text-lg font-semibold"
                    />
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[500, 1000, 2000, 5000].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => quickPayAmount(amount)}
                          className="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-blue-500 hover:to-indigo-600 hover:text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all border border-gray-300 hover:border-blue-500"
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  </div>

                  {amountPaid && parseFloat(amountPaid) >= total && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border-2 border-emerald-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-700">
                          Change Due:
                        </span>
                        <span className="text-2xl font-bold text-emerald-600">
                          Rs {change.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={processBill}
                    disabled={
                      isProcessing ||
                      cart.length === 0 ||
                      !amountPaid ||
                      parseFloat(amountPaid) < total
                    }
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg h-14 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Complete Sale
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetBill}
                    variant="outline"
                    className="px-6 h-14 border-2 border-gray-300 hover:bg-gray-50 rounded-xl"
                  >
                    <Trash2 className="h-5 w-5 text-gray-600" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-4 shadow-lg border-0 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Items</p>
                  <p className="text-3xl font-bold">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 opacity-80" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
