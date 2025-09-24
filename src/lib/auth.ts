import { NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function getCurrentUser(request?: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return null;
    }

    // Verify and extract userId from signed cookie
    let userId: number;
    try {
      const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
      const cookieValue = sessionCookie.value;
      
      // Simple signed cookie format: value.signature
      const [sessionData, signature] = cookieValue.split('.');
      
      if (!sessionData || !signature) {
        return null;
      }

      // Verify signature
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', sessionSecret)
        .update(sessionData)
        .digest('hex');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode session data
      const decodedData = Buffer.from(sessionData, 'base64').toString('utf-8');
      const sessionInfo = JSON.parse(decodedData);
      
      if (!sessionInfo.userId) {
        return null;
      }

      userId = parseInt(sessionInfo.userId);
      
      if (isNaN(userId)) {
        return null;
      }

    } catch (error) {
      return null;
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
      return null;
    }

    return user[0];
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
}