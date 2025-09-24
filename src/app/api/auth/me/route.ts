import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'No session found',
        code: 'NO_SESSION' 
      }, { status: 401 });
    }

    // Verify and extract userId from signed cookie
    let userId: number;
    try {
      const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
      const cookieValue = sessionCookie.value;
      
      // Simple signed cookie format: value.signature
      const [sessionData, signature] = cookieValue.split('.');
      
      if (!sessionData || !signature) {
        return NextResponse.json({ 
          error: 'Invalid session format',
          code: 'INVALID_SESSION_FORMAT' 
        }, { status: 401 });
      }

      // Verify signature
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', sessionSecret)
        .update(sessionData)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ 
          error: 'Invalid session signature',
          code: 'INVALID_SESSION_SIGNATURE' 
        }, { status: 401 });
      }

      // Decode session data
      const decodedData = Buffer.from(sessionData, 'base64').toString('utf-8');
      const sessionInfo = JSON.parse(decodedData);
      
      if (!sessionInfo.userId) {
        return NextResponse.json({ 
          error: 'No user ID in session',
          code: 'NO_USER_ID_IN_SESSION' 
        }, { status: 401 });
      }

      userId = parseInt(sessionInfo.userId);
      
      if (isNaN(userId)) {
        return NextResponse.json({ 
          error: 'Invalid user ID in session',
          code: 'INVALID_USER_ID' 
        }, { status: 401 });
      }

    } catch (error) {
      return NextResponse.json({ 
        error: 'Session verification failed',
        code: 'SESSION_VERIFICATION_FAILED' 
      }, { status: 401 });
    }

    // Find user by ID
    const user = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Return user data
    return NextResponse.json({
      success: true,
      data: user[0]
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}