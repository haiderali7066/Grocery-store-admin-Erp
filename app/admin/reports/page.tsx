'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface ProfitLossData {
  period: string;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: number;
  operatingProfit: number;
  operatingMargin: number;
  taxExpense: number;
  netProfit: number;
  netProfitMargin: number;
}

interface RevenueBreakdown {
  source: string;
  amount: number;
  percentage: number;
}

interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export default function ReportsPage() {
  const [plData, setPLData] = useState<ProfitLossData | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams({
        period,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const response = await fetch(`/api/admin/reports/pl?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPLData(data.plData);
        setRevenueBreakdown(data.revenueBreakdown || []);
        setExpenseBreakdown(data.expenseBreakdown || []);
      }
    } catch (error) {
      console.error('Failed to fetch P&L report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = () => {
    setIsLoading(true);
    fetchReports();
  };

  const exportReport = () => {
    if (!plData) return;

    const reportContent = `
PROFIT & LOSS REPORT
Period: ${plData.period}
Generated: ${new Date().toLocaleString()}

========================================
REVENUE SECTION
========================================
Total Revenue: Rs. ${plData.totalRevenue.toFixed(2)}

COST OF GOODS SOLD
${revenueBreakdown.length > 0 ? revenueBreakdown.map((r) => `${r.source}: Rs. ${r.amount.toFixed(2)} (${r.percentage.toFixed(1)}%)`).join('\n') : 'N/A'}

Total COGS: Rs. ${plData.totalCogs.toFixed(2)}

========================================
PROFIT ANALYSIS
========================================
Gross Profit: Rs. ${plData.grossProfit.toFixed(2)}
Gross Profit Margin: ${plData.grossProfitMargin.toFixed(2)}%

Operating Expenses: Rs. ${plData.operatingExpenses.toFixed(2)}
${expenseBreakdown.length > 0 ? expenseBreakdown.map((e) => `  - ${e.category}: Rs. ${e.amount.toFixed(2)} (${e.percentage.toFixed(1)}%)`).join('\n') : '  N/A'}

Operating Profit: Rs. ${plData.operatingProfit.toFixed(2)}
Operating Margin: ${plData.operatingMargin.toFixed(2)}%

Tax Expense: Rs. ${plData.taxExpense.toFixed(2)}

NET PROFIT: Rs. ${plData.netProfit.toFixed(2)}
Net Profit Margin: ${plData.netProfitMargin.toFixed(2)}%
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-report-${new Date().getTime()}.txt`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600 text-lg">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profit & Loss Report</h1>
          <p className="text-gray-600">Financial analysis and performance metrics</p>
        </div>
        <Button onClick={exportReport} className="bg-blue-600 hover:bg-blue-700 rounded-full">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Date Filters */}
      <Card className="p-6 border-0 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setIsLoading(true);
                setTimeout(() => fetchReports(), 0);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {period === 'custom' && (
            <>
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
              <div className="flex items-end">
                <Button
                  onClick={handleDateChange}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-full"
                >
                  Apply Filter
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* P&L Summary */}
      {plData && (
        <>
          {/* Revenue Section */}
          <Card className="p-6 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Revenue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  Rs. {plData.totalRevenue.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Revenue Sources</p>
                <div className="mt-2 space-y-1">
                  {revenueBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.source}:</span>
                      <span className="font-medium">
                        Rs. {item.amount.toFixed(0)} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Cost Section */}
          <Card className="p-6 border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Cost of Goods Sold</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total COGS</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  Rs. {plData.totalCogs.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gross Profit</p>
                <p className="text-2xl font-bold text-green-700 mt-2">
                  Rs. {plData.grossProfit.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Margin: {plData.grossProfitMargin.toFixed(2)}%
                </p>
              </div>
            </div>
          </Card>

          {/* Operating Section */}
          <Card className="p-6 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Operating Expenses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Operating Expenses</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  Rs. {plData.operatingExpenses.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expense Breakdown</p>
                <div className="mt-2 space-y-1">
                  {expenseBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.category}:</span>
                      <span className="font-medium">
                        Rs. {item.amount.toFixed(0)} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Net Profit Section */}
          <Card
            className={`p-6 border-0 shadow-md ${
              plData.netProfit >= 0
                ? 'bg-gradient-to-br from-green-50 to-green-100'
                : 'bg-gradient-to-br from-red-50 to-red-100'
            }`}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              {plData.netProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              Net Profit
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Operating Profit</p>
                <p
                  className={`text-2xl font-bold mt-2 ${
                    plData.operatingProfit >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  Rs. {plData.operatingProfit.toFixed(0)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Margin: {plData.operatingMargin.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tax Expense</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  Rs. {plData.taxExpense.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    plData.netProfit >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  Rs. {plData.netProfit.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Margin: {plData.netProfitMargin.toFixed(2)}%
                </p>
              </div>
            </div>
          </Card>

          {/* Summary Table */}
          <Card className="p-6 border-0 shadow-md overflow-x-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Summary</h2>
            <table className="w-full">
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-900">Total Revenue</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    Rs. {plData.totalRevenue.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-900">Less: Cost of Goods Sold</td>
                  <td className="py-3 px-4 text-right font-semibold text-red-600">
                    (Rs. {plData.totalCogs.toFixed(2)})
                  </td>
                </tr>
                <tr className="border-b bg-green-50">
                  <td className="py-3 px-4 font-bold text-gray-900">Gross Profit</td>
                  <td className="py-3 px-4 text-right font-bold text-green-900">
                    Rs. {plData.grossProfit.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-900">Less: Operating Expenses</td>
                  <td className="py-3 px-4 text-right font-semibold text-red-600">
                    (Rs. {plData.operatingExpenses.toFixed(2)})
                  </td>
                </tr>
                <tr className="border-b bg-blue-50">
                  <td className="py-3 px-4 font-bold text-gray-900">Operating Profit</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-900">
                    Rs. {plData.operatingProfit.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-900">Less: Tax Expense</td>
                  <td className="py-3 px-4 text-right font-semibold text-red-600">
                    (Rs. {plData.taxExpense.toFixed(2)})
                  </td>
                </tr>
                <tr className="bg-green-100">
                  <td className="py-3 px-4 font-bold text-gray-900 text-lg">NET PROFIT</td>
                  <td
                    className={`py-3 px-4 text-right font-bold text-lg ${
                      plData.netProfit >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    Rs. {plData.netProfit.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
