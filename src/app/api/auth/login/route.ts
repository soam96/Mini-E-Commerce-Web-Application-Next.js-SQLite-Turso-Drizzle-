import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({
        error: "Email is required",
        code: "MISSING_EMAIL"
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({
        error: "Password is required",
        code: "MISSING_PASSWORD"
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: "Invalid email format",
        code: "INVALID_EMAIL"
      }, { status: 400 });
    }

    // Find user by email
    const userResult = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({
        error: "User not found. Please register to continue.",
        code: "USER_NOT_FOUND"
      }, { status: 404 });
    }

    const user = userResult[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      }, { status: 401 });
    }

    // Create session cookie
    const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
    const sessionData = JSON.stringify({ userId: user.id });
    
    // Simple signing mechanism (same as register)
    const signature = createHmac('sha256', sessionSecret)
      .update(sessionData)
      .digest('hex');
    
    const signedSession = `${Buffer.from(sessionData).toString('base64')}.${signature}`;

    // Create response
    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }, { status: 200 });

    // Set httpOnly session cookie with 7-day expiry
    response.cookies.set('session', signedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}