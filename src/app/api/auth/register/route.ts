import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, role = 'Customer' } = body;

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json({
        error: 'Username, email, and password are required',
        code: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      }, { status: 400 });
    }

    // Validate username length
    if (username.length < 3) {
      return NextResponse.json({
        error: 'Username must be at least 3 characters long',
        code: 'INVALID_USERNAME'
      }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({
        error: 'Password must be at least 6 characters long',
        code: 'INVALID_PASSWORD'
      }, { status: 400 });
    }

    // Validate role
    const validRoles = ['Customer', 'Seller', 'Admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({
        error: 'Invalid role. Must be Customer, Seller, or Admin',
        code: 'INVALID_ROLE'
      }, { status: 400 });
    }

    // Check if username or email already exists
    const existingUser = await db.select()
      .from(users)
      .where(or(
        eq(users.username, username.trim()),
        eq(users.email, email.toLowerCase().trim())
      ))
      .limit(1);

    if (existingUser.length > 0) {
      const isUsernameConflict = existingUser[0].username === username.trim();
      const isEmailConflict = existingUser[0].email === email.toLowerCase().trim();
      
      return NextResponse.json({
        error: isUsernameConflict ? 'Username already exists' : 'Email already exists',
        code: isUsernameConflict ? 'USERNAME_EXISTS' : 'EMAIL_EXISTS'
      }, { status: 409 });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await db.insert(users)
      .values({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        createdAt: new Date().toISOString()
      })
      .returning();

    const createdUser = newUser[0];

    // Create session cookie
    const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
    const sessionData = JSON.stringify({ userId: createdUser.id });
    
    // Simple signing mechanism (in production, use a proper JWT library)
    const signature = createHmac('sha256', sessionSecret)
      .update(sessionData)
      .digest('hex');
    
    const signedSession = `${Buffer.from(sessionData).toString('base64')}.${signature}`;

    // Set cookie with 7-day expiry
    const response = NextResponse.json({
      success: true,
      data: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        role: createdUser.role
      }
    }, { status: 201 });

    response.cookies.set('session', signedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}