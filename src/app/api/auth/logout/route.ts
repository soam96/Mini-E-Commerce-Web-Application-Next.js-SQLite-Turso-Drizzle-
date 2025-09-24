import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create response with success message
    const response = NextResponse.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    }, { status: 200 });

    // Clear the session cookie by setting it to empty with past expiry
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0) // Past date to clear the cookie
    });

    return response;
  } catch (error) {
    console.error('POST logout error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}