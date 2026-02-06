'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingDown, DollarSign } from 'lucide-react';

interface Investment {
  _id: string;
  amount: number;
  source: string;
  remainingBalance: number;
  status: 'active' | 'exhausted';
  investmentDate: string;
  description: string;
}

export default function InvestmentPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    source: 'cash',
    description: '',
  });

  const fetchInvestments = async () => {
    try {
      const res = await fetch('/api/admin/investment');
      if (res.ok) {
        const data = await res.json();
        setInvestments(data.investments);
        setTotalInvestment(data.totalInvestment);
        setRemainingBalance(data.remainingBalance);
      }
    } catch (error) {
      console.error('[v0] Investment fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleAddInvestment = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Enter valid amount');
      return;
    }

    try {
      const res = await fetch('/api/admin/investment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          source: formData.source,
          description: formData.description,
        }),
      });

      if (res.ok) {
        alert('Investment added');
        setFormData({ amount: '', source: 'cash', description: '' });
        setShowDialog(false);
        fetchInvestments();
      }
    } catch (error) {
      console.error('[v0] Investment add error:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading investments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investment & Capital</h1>
          <p className="text-gray-600 mt-2">Track business investment and capital</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-green-700 hover:bg-green-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Investment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Investment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Wallet
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Initial capital, additional funds, etc."
                />
              </div>
              <Button
                onClick={handleAddInvestment}
                className="w-full bg-green-700 hover:bg-green-800"
              >
                Add Investment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-0 shadow-md bg-blue-50">
          <p className="text-sm text-gray-600">Total Investment</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            Rs. {totalInvestment.toLocaleString()}
          </p>
        </Card>
        <Card className="p-6 border-0 shadow-md bg-green-50">
          <p className="text-sm text-gray-600">Remaining Balance</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            Rs. {remainingBalance.toLocaleString()}
          </p>
        </Card>
        <Card className="p-6 border-0 shadow-md bg-orange-50">
          <p className="text-sm text-gray-600">Used for Purchases</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            Rs. {(totalInvestment - remainingBalance).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Investment History */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Investment History</h2>
        <div className="space-y-3">
          {investments.length > 0 ? (
            investments.map((inv) => (
              <div
                key={inv._id}
                className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{inv.description}</p>
                    <p className="text-sm text-gray-600">
                      From {inv.source} on {new Date(inv.investmentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">Rs. {inv.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">
                    Remaining: Rs. {inv.remainingBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center py-4">No investments yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
