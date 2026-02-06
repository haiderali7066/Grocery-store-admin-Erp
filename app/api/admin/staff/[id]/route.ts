import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getTokenFromCookie, hashPassword } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get('cookie') || '');
    const payload = verifyAuth(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { name, email, phone, role, password } = await req.json();
    const updateData: any = { name, email, phone, role };

    if (password) {
      updateData.password = await hashPassword(password);
    }

    const staff = await User.findByIdAndUpdate(params.id, updateData, {
      new: true,
    }).select('-password');

    if (!staff) {
      return NextResponse.json({ message: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Updated', staff }, { status: 200 });
  } catch (error) {
    console.error('[Staff PUT] Error:', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get('cookie') || '');
    const payload = verifyAuth(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const staff = await User.findByIdAndDelete(params.id);
    if (!staff) {
      return NextResponse.json({ message: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deleted' }, { status: 200 });
  } catch (error) {
    console.error('[Staff DELETE] Error:', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
