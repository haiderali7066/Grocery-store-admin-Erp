"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Landmark,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner"; // Assuming you use sonner or similar for notifications

interface WalletBalance {
  cash: number;
  bank: number;
  easyPaisa: number;
  jazzCash: number;
  card: number;
  totalBalance: number;
}

interface Transaction {
  _id: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  source: string;
  destination?: string;
  description: string;
  createdAt: string;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Transfer Modal State
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({
    amount: 0,
    fromMethod: "",
    toMethod: "",
  });

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await fetch("/api/admin/wallet");
      const data = await res.json();
      setWallet(data.wallet);
      setTransactions(data.transactions);
      setFilteredTransactions(data.transactions);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (
      transferData.amount <= 0 ||
      !transferData.fromMethod ||
      !transferData.toMethod
    ) {
      return alert("Please fill all fields correctly");
    }

    setIsTransferring(true);
    try {
      const res = await fetch("/api/admin/wallet/transfer", {
        method: "POST",
        body: JSON.stringify(transferData),
      });
      const data = await res.json();
      if (res.ok) {
        setWallet(data.wallet);
        fetchWallet(); // Refresh transactions
        setTransferData({ amount: 0, fromMethod: "", toMethod: "" });
        alert("Transfer Successful!");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-10 text-center text-gray-500">
        Loading Financial Data...
      </div>
    );

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wallet Audit</h1>
          <p className="text-gray-600">
            Real-time balance across all payment methods
          </p>
        </div>
        <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg">
          <p className="text-xs uppercase font-black opacity-80">
            Total Liquidity
          </p>
          <p className="text-2xl font-bold">
            Rs. {wallet?.totalBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Individual Wallets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: "Physical Cash",
            key: "cash",
            icon: WalletIcon,
            color: "bg-emerald-500",
          },
          {
            label: "Bank Account",
            key: "bank",
            icon: Landmark,
            color: "bg-blue-500",
          },
          {
            label: "EasyPaisa",
            key: "easyPaisa",
            icon: Smartphone,
            color: "bg-green-600",
          },
          {
            label: "JazzCash",
            key: "jazzCash",
            icon: Smartphone,
            color: "bg-red-600",
          },
          {
            label: "Credit Card",
            key: "card",
            icon: CreditCard,
            color: "bg-slate-700",
          },
        ].map((w) => (
          <Card
            key={w.key}
            className="p-4 border-0 shadow-sm relative overflow-hidden group"
          >
            <div
              className={`absolute top-0 right-0 p-2 rounded-bl-xl ${w.color} text-white`}
            >
              <w.icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase">
              {w.label}
            </p>
            <p className="text-xl font-black text-gray-900 mt-1">
              Rs.{" "}
              {wallet?.[w.key as keyof WalletBalance]?.toLocaleString() || 0}
            </p>
          </Card>
        ))}
      </div>

      {/* Transfer Funds UI */}
      <Card className="p-6 border-0 shadow-lg bg-white">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-indigo-600" /> Internal Wallet
          Transfer
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500">
              From Wallet
            </label>
            <select
              className="w-full mt-1 p-2 border rounded-lg"
              value={transferData.fromMethod}
              onChange={(e) =>
                setTransferData({ ...transferData, fromMethod: e.target.value })
              }
            >
              <option value="">Select Source</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="easyPaisa">EasyPaisa</option>
              <option value="jazzCash">JazzCash</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">To Wallet</label>
            <select
              className="w-full mt-1 p-2 border rounded-lg"
              value={transferData.toMethod}
              onChange={(e) =>
                setTransferData({ ...transferData, toMethod: e.target.value })
              }
            >
              <option value="">Select Destination</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="easyPaisa">EasyPaisa</option>
              <option value="jazzCash">JazzCash</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">
              Amount (Rs.)
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={transferData.amount}
              onChange={(e) =>
                setTransferData({
                  ...transferData,
                  amount: Number(e.target.value),
                })
              }
            />
          </div>
          <Button
            onClick={handleTransfer}
            disabled={isTransferring}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isTransferring ? "Processing..." : "Execute Transfer"}
          </Button>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="p-0 border-0 shadow-md overflow-hidden bg-white">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-700">
            Audit Trail (Recent Transactions)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Flow</th>
                <th className="px-6 py-4">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTransactions.map((tx) => (
                <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900 capitalize">
                      {tx.category.replace("_", " ")}
                    </p>
                    <p className="text-xs text-gray-500">{tx.description}</p>
                  </td>
                  <td className="px-6 py-4 capitalize">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100">
                      {tx.source} {tx.destination ? `→ ${tx.destination}` : ""}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-4 font-bold text-sm ${tx.type === "income" ? "text-emerald-600" : tx.type === "expense" ? "text-red-600" : "text-indigo-600"}`}
                  >
                    {tx.type === "income"
                      ? "+"
                      : tx.type === "expense"
                        ? "-"
                        : ""}{" "}
                    Rs. {tx.amount.toLocaleString()}
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
