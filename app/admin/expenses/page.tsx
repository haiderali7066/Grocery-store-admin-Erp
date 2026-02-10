"use client";

import React from "react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, DollarSign } from "lucide-react";

interface Expense {
  _id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    category: "rent",
    amount: "",
    description: "",
  });

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/admin/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotalExpenses(data.total || 0);
      }
    } catch (error) {
      console.error("[v1] Expenses fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      alert("Please enter amount");
      return;
    }

    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ category: "rent", amount: "", description: "" });
        setShowDialog(false);
        fetchExpenses();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add expense");
      }
    } catch (error) {
      console.error("[v1] Failed to add expense:", error);
      alert("Failed to add expense");
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (confirm("Delete this expense?")) {
      try {
        await fetch(`/api/admin/expenses/${expenseId}`, { method: "DELETE" });
        fetchExpenses();
      } catch (error) {
        console.error("[v1] Failed to delete expense:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-gray-600">Manage business expenses</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="salary">Salary</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Amount (Rs)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Enter description (optional)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-primary rounded-full"
                >
                  Add Expense
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 rounded-full bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Expenses Card */}
      <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Total Expenses (This Month)</p>
            <h2 className="text-3xl font-bold text-red-600">
              Rs. {totalExpenses.toLocaleString()}
            </h2>
          </div>
          <DollarSign className="h-12 w-12 text-red-600/30" />
        </div>
      </Card>

      {/* Expenses List */}
      <Card className="p-6 border-0 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Recent Expenses</h3>
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No expenses recorded</p>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium capitalize">{expense.category}</p>
                  {expense.description && (
                    <p className="text-sm text-gray-500">
                      {expense.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-red-600">
                    Rs. {expense.amount.toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleDelete(expense._id)}
                    className="p-2 hover:bg-red-100 rounded-full transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
