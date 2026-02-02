import { NextResponse } from 'next/server';
import { cleanupExpiredOAuthStates, cleanupExpiredSessions } from '@/lib/db';

// Vercel Cron Job - runs every 6 hours to clean up expired data
// Configured in vercel.json: "0 */6 * * *"

export async function GET(request: Request) {
  try {
    // Verify this is a Vercel cron request (in production)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean up expired OAuth states (older than 10 minutes)
    const statesDeleted = await cleanupExpiredOAuthStates();

    // Clean up expired sessions (older than 4 hours)
    const sessionsDeleted = await cleanupExpiredSessions();

    console.log(`[Cron] Cleanup complete: ${statesDeleted} states, ${sessionsDeleted} sessions`);

    return NextResponse.json({
      success: true,
      cleanup: {
        expiredStates: statesDeleted,
        expiredSessions: sessionsDeleted,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Cleanup failed:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
