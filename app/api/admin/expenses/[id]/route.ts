import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/lib/models";

// GET a single expense by ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await context.params;

    const expense = await Transaction.findOne({ _id: id, type: "expense" });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({
      _id: expense._id.toString(),
      category: expense.category,
      amount: expense.amount,
      description: expense.description || "",
      date: expense.createdAt.toISOString(),
      source: expense.source,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch expense" },
      { status: 500 },
    );
  }
}

// DELETE an expense by ID
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await context.params;

    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      type: "expense",
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Expense not found or already deleted" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Expense deleted successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete expense" },
      { status: 500 },
    );
  }
}
