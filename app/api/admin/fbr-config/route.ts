import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { FBRConfig } from '@/lib/models';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPayload = verifyAuth(authToken);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    let config = await FBRConfig.findOne();

    // Create default config if not exists
    if (!config) {
      config = new FBRConfig({
        businessName: process.env.STORE_NAME || 'Khas Pure Food',
        ntn: process.env.STORE_NTN || '',
        strn: process.env.STORE_STRN || '',
        isEnabled: false,
      });
      await config.save();
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('[FBR Config] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FBR configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPayload = verifyAuth(authToken);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    let config = await FBRConfig.findOne();

    if (!config) {
      config = new FBRConfig(body);
    } else {
      Object.assign(config, body);
    }

    await config.save();

    return NextResponse.json(config);
  } catch (error) {
    console.error('[FBR Config] Error saving:', error);
    return NextResponse.json(
      { error: 'Failed to save FBR configuration' },
      { status: 500 }
    );
  }
}
