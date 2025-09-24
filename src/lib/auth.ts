import { NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { createHmac } from 'node:crypto';

export async function getCurrentUser(request?: NextRequest) {
  try {
    // Get session cookie (prefer request if provided)
    const sessionCookie = request?.cookies.get('session') ?? cookies().get('session');

    if (!sessionCookie) {
      return null;
    }

    // Verify and extract userId from signed cookie
    let userId: number;
    try {
      const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
      const cookieValue = sessionCookie.value;

      // Simple signed cookie format: base64(json).signature
      const [sessionDataB64Raw, signature] = cookieValue.split('.');

      if (!sessionDataB64Raw || !signature) {
        return null;
      }

      // Normalize base64 (support base64url)
      const sessionDataB64 = sessionDataB64Raw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = sessionDataB64 + '='.repeat((4 - (sessionDataB64.length % 4)) % 4);
      const decodedData = Buffer.from(padded, 'base64').toString('utf-8');

      // Verify signature against the decoded JSON string (matches login signing)
      const expectedSignature = createHmac('sha256', sessionSecret)
        .update(decodedData)
        .digest('hex');

      if (signature !== expectedSignature) {
        return null;
      }

      // Parse decoded session JSON
      const sessionInfo = JSON.parse(decodedData);

      if (sessionInfo?.userId == null) {
        return null;
      }

      userId = Number(sessionInfo.userId);
      if (!Number.isFinite(userId)) {
        return null;
      }
    } catch (_error) {
      return null;
    }

    // Find user by ID
    const user = await db
      .select({ id: users.id, username: users.username, email: users.email, role: users.role })
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