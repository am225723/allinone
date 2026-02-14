/**
 * API Route: Dashboard Statistics
 */

import { NextResponse } from 'next/server';
import { getDashboardStats, getRecentActivity, getTrendData } from '@/lib/stats';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    if (type === 'activity') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const activity = await getRecentActivity(limit);
      return NextResponse.json({ ok: true, activity });
    }

    if (type === 'trends') {
      const days = parseInt(searchParams.get('days') || '7');
      const trends = await getTrendData(days);
      return NextResponse.json({ ok: true, trends });
    }

    // Default: return all stats
    const stats = await getDashboardStats();
    return NextResponse.json({ ok: true, stats });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}