import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const expenses = await Transaction.find({ type: "expense" }).sort({
      createdAt: -1,
    });
    const total = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        _id: e._id.toString(),
        category: e.category,
        amount: e.amount,
        description: e.description || "",
        date: e.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { amount, description, category } = body;

    if (!amount || !category) {
      return NextResponse.json(
        { error: "Amount and category are required" },
        { status: 400 },
      );
    }

    const expense = await Transaction.create({
      type: "expense",
      amount: Number(amount),
      category,
      description,
      source: "cash", // required field
    });

    return NextResponse.json(
      {
        _id: expense._id.toString(),
        category: expense.category,
        amount: expense.amount,
        description: expense.description || "",
        date: expense.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    // Make sure error.message exists
    return NextResponse.json(
      { error: error?.message || "Something went wrong" },
      { status: 500 },
    );
  }
}
