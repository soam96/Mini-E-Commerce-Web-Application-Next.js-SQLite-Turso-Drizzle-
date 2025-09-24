import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'No session found',
        code: 'NO_SESSION' 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: user
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}