import { NextRequest, NextResponse } from 'next/server';

const expensesDB: any[] = [];

export async function GET() {
  try {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthExpenses = expensesDB.filter((e) => {
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      expenses: monthExpenses,
      total,
    });
  } catch (error) {
    console.error('[v0] Expenses fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, amount, description } = body;

    if (!category || !amount) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expense = {
      _id: Date.now().toString(),
      category,
      amount: parseFloat(amount),
      description,
      date: new Date().toISOString(),
    };

    expensesDB.push(expense);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('[v0] Expense creation error:', error);
    return NextResponse.json(
      { message: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
