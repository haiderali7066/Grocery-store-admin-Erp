import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { verifyFBRConfiguration } from '@/lib/fbr';

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

    const body = await request.json();

    // Verify configuration fields
    if (!body.ntn || !body.strn || !body.posDeviceId || !body.posDeviceSerialNumber) {
      return NextResponse.json(
        { status: 'failed', message: 'Missing required FBR configuration fields' },
        { status: 400 }
      );
    }

    // Test FBR connection (simulate)
    // In production, make actual FBR API call
    const isValid = await verifyFBRConfiguration();

    if (isValid) {
      return NextResponse.json({
        status: 'success',
        message: 'FBR connection verified successfully',
        details: {
          ntn: body.ntn,
          strn: body.strn,
          deviceId: body.posDeviceId,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return NextResponse.json({
        status: 'failed',
        message: 'FBR connection test failed. Please check your credentials.',
      });
    }
  } catch (error) {
    console.error('[FBR Test] Error:', error);
    return NextResponse.json(
      {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Connection test failed',
      },
      { status: 500 }
    );
  }
}
