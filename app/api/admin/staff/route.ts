import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getTokenFromCookie, hashPassword } from '@/lib/auth';

const ADMIN_ROLES = ['admin', 'manager'];

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get('cookie') || '');
    const payload = verifyAuth(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const staff = await User.find({ role: { $in: ['admin', 'manager', 'accountant', 'staff'] } })
      .select('-password')
      .lean();

    return NextResponse.json({ staff }, { status: 200 });
  } catch (error) {
    console.error('[Staff GET] Error:', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get('cookie') || '');
    const payload = verifyAuth(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { name, email, phone, role, password } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newStaff = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      isActive: true,
    });

    await newStaff.save();

    return NextResponse.json(
      { message: 'Staff member created', staff: newStaff },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Staff POST] Error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
