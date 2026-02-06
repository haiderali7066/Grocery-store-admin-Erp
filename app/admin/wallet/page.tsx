'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface WalletBalance {
  totalBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
  lastUpdated?: string;
}

interface Transaction {
  _id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount?: number;
  source: string;
  description: string;
  createdAt: string;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filterType, dateFrom, dateTo]);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/admin/wallet');
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet || {});
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Wallet fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = transactions;

    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFrom) {
      filtered = filtered.filter((t) => new Date(t.createdAt) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter((t) => new Date(t.createdAt) <= new Date(dateTo));
    }

    setFilteredTransactions(filtered);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600 text-lg">Loading wallet data...</p>
      </div>
    );
  }

  const walletData = {
    totalBalance: wallet?.totalBalance ?? 0,
    totalIncome: wallet?.totalIncome ?? 0,
    totalExpense: wallet?.totalExpense ?? 0,
    lastUpdated: wallet?.lastUpdated ?? new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wallet & Finance</h1>
          <p className="text-gray-600">Track income, expenses, and overall balance</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-blue-600 font-medium">Current Balance</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                Rs. {(walletData.totalBalance ?? 0).toFixed(0)}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Income</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                Rs. {(walletData.totalIncome ?? 0).toFixed(0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-red-600 font-medium">Total Expense</p>
              <p className="text-3xl font-bold text-red-900 mt-2">
                Rs. {(walletData.totalExpense ?? 0).toFixed(0)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 border-0 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <Input
              placeholder="Search description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Transactions</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
              <option value="transfer">Transfer Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="p-6 border-0 shadow-md overflow-x-auto">
        {filteredTransactions.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Source</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr
                  key={tx._id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedTransaction(tx);
                    setShowDetail(true);
                  }}
                >
                  <td className="py-3 px-4 text-sm">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {tx.type === 'income' ? (
                        <>
                          <ArrowDownLeft className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            Income
                          </span>
                        </>
                      ) : tx.type === 'expense' ? (
                        <>
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                            Expense
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4 text-orange-600" />
                          <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            Transfer
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm capitalize">{tx.category}</td>
                  <td className="py-3 px-4 text-sm capitalize">{tx.source}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{tx.description}</td>
                  <td className="py-3 px-4 text-sm font-semibold">
                    <span
                      className={
                        tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {tx.type === 'income' ? '+' : '-'}Rs. {(Math.abs(tx.amount ?? 0)).toFixed(0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-500 py-8">No transactions found</p>
        )}
      </Card>

      {/* Detail Modal */}
      {showDetail && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">Transaction Details</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">Type</p>
                <p
                  className={`text-lg font-semibold capitalize mt-1 ${
                    selectedTransaction.type === 'income'
                      ? 'text-green-600'
                      : selectedTransaction.type === 'expense'
                      ? 'text-red-600'
                      : 'text-orange-600'
                  }`}
                >
                  {selectedTransaction.type}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  Rs. {(Math.abs(selectedTransaction.amount ?? 0)).toFixed(0)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium capitalize">{selectedTransaction.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <span className="font-medium capitalize">{selectedTransaction.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium">{selectedTransaction.description}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(selectedTransaction.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowDetail(false)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-full mt-6"
            >
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
