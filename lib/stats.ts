/**
 * Dashboard Statistics
 * Provides real-time metrics for the dashboard
 */

import { supabaseServer as supabase } from './supabase';

export interface DashboardStats {
  openphone: {
    pendingDrafts: number;
    approvedDrafts: number;
    totalConversations: number;
    needsResponse: number;
    todayActivity: number;
  };
  gmail: {
    unreadEmails: number;
    pendingDrafts: number;
    processedToday: number;
    highPriority: number;
    needsResponse: number;
  };
  overall: {
    totalCommunications: number;
    responseRate: number;
    avgResponseTime: string;
    activeToday: number;
  };
}

export interface ActivityItem {
  id: string;
  type: 'openphone' | 'gmail';
  action: string;
  description: string;
  timestamp: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [openphoneStats, gmailStats, overallStats] = await Promise.all([
      getOpenPhoneStats(),
      getGmailStats(),
      getOverallStats(),
    ]);

    return {
      openphone: openphoneStats,
      gmail: gmailStats,
      overall: overallStats,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return getEmptyStats();
  }
}

/**
 * Get OpenPhone statistics
 */
async function getOpenPhoneStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get draft counts
    const { data: drafts } = await supabase
      .from('draft_replies')
      .select('status, created_at');

    const pendingDrafts = drafts?.filter(d => d.status === 'pending').length || 0;
    const approvedDrafts = drafts?.filter(d => d.status === 'approved').length || 0;

    // Get summaries needing response
    const { data: summaries } = await supabase
      .from('summaries')
      .select('needs_response, created_at')
      .eq('needs_response', true);

    const needsResponse = summaries?.length || 0;

    // Get today's activity
    const { data: todayRuns } = await supabase
      .from('runs')
      .select('processed')
      .gte('created_at', today.toISOString());

    const todayActivity = todayRuns?.reduce((sum, run) => sum + (run.processed || 0), 0) || 0;

    // Get total conversations
    const { count: totalConversations } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true });

    return {
      pendingDrafts,
      approvedDrafts,
      totalConversations: totalConversations || 0,
      needsResponse,
      todayActivity,
    };
  } catch (error) {
    console.error('Error fetching OpenPhone stats:', error);
    return {
      pendingDrafts: 0,
      approvedDrafts: 0,
      totalConversations: 0,
      needsResponse: 0,
      todayActivity: 0,
    };
  }
}

/**
 * Get Gmail statistics
 */
async function getGmailStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get email logs
    const { data: emails } = await supabase
      .from('email_logs')
      .select('needs_response, priority, created_at, draft_created');

    const unreadEmails = emails?.filter(e => e.needs_response && !e.draft_created).length || 0;
    const pendingDrafts = emails?.filter(e => e.draft_created).length || 0;
    const highPriority = emails?.filter(e => e.priority === 'high').length || 0;
    const needsResponse = emails?.filter(e => e.needs_response).length || 0;

    // Get today's processed emails
    const processedToday = emails?.filter(e => 
      new Date(e.created_at) >= today
    ).length || 0;

    return {
      unreadEmails,
      pendingDrafts,
      processedToday,
      highPriority,
      needsResponse,
    };
  } catch (error) {
    console.error('Error fetching Gmail stats:', error);
    return {
      unreadEmails: 0,
      pendingDrafts: 0,
      processedToday: 0,
      highPriority: 0,
      needsResponse: 0,
    };
  }
}

/**
 * Get overall statistics
 */
async function getOverallStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total communications
    const [{ count: smsCount }, { count: emailCount }] = await Promise.all([
      supabase.from('summaries').select('*', { count: 'exact', head: true }),
      supabase.from('email_logs').select('*', { count: 'exact', head: true }),
    ]);

    const totalCommunications = (smsCount || 0) + (emailCount || 0);

    // Calculate response rate
    const { data: drafts } = await supabase
      .from('draft_replies')
      .select('status');

    const totalDrafts = drafts?.length || 0;
    const sentDrafts = drafts?.filter(d => d.status === 'sent').length || 0;
    const responseRate = totalDrafts > 0 ? Math.round((sentDrafts / totalDrafts) * 100) : 0;

    // Calculate average response time (simplified)
    const avgResponseTime = '2.5 hours'; // TODO: Calculate from actual data

    // Get today's active communications
    const [{ data: todaySms }, { data: todayEmails }] = await Promise.all([
      supabase.from('summaries').select('id').gte('created_at', today.toISOString()),
      supabase.from('email_logs').select('id').gte('created_at', today.toISOString()),
    ]);

    const activeToday = (todaySms?.length || 0) + (todayEmails?.length || 0);

    return {
      totalCommunications,
      responseRate,
      avgResponseTime,
      activeToday,
    };
  } catch (error) {
    console.error('Error fetching overall stats:', error);
    return {
      totalCommunications: 0,
      responseRate: 0,
      avgResponseTime: 'N/A',
      activeToday: 0,
    };
  }
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
  try {
    const activities: ActivityItem[] = [];

    // Get recent OpenPhone activities
    const { data: recentRuns } = await supabase
      .from('runs')
      .select('id, processed, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentRuns) {
      recentRuns.forEach(run => {
        activities.push({
          id: run.id,
          type: 'openphone',
          action: 'run_completed',
          description: `Processed ${run.processed} conversations`,
          timestamp: run.created_at,
        });
      });
    }

    // Get recent Gmail activities
    const { data: recentEmails } = await supabase
      .from('email_logs')
      .select('id, priority, created_at, needs_response')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentEmails) {
      recentEmails.forEach(email => {
        activities.push({
          id: email.id,
          type: 'gmail',
          action: 'email_processed',
          description: email.needs_response ? 'Email needs response' : 'Email processed',
          timestamp: email.created_at,
          priority: email.priority,
        });
      });
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Get empty stats (fallback)
 */
function getEmptyStats(): DashboardStats {
  return {
    openphone: {
      pendingDrafts: 0,
      approvedDrafts: 0,
      totalConversations: 0,
      needsResponse: 0,
      todayActivity: 0,
    },
    gmail: {
      unreadEmails: 0,
      pendingDrafts: 0,
      processedToday: 0,
      highPriority: 0,
      needsResponse: 0,
    },
    overall: {
      totalCommunications: 0,
      responseRate: 0,
      avgResponseTime: 'N/A',
      activeToday: 0,
    },
  };
}

/**
 * Get trend data for charts
 */
export async function getTrendData(days: number = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: runs } = await supabase
      .from('runs')
      .select('created_at, processed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const { data: emails } = await supabase
      .from('email_logs')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Group by day
    const trendMap = new Map<string, { sms: number; email: number }>();

    runs?.forEach(run => {
      const date = new Date(run.created_at).toISOString().split('T')[0];
      const current = trendMap.get(date) || { sms: 0, email: 0 };
      current.sms += run.processed || 0;
      trendMap.set(date, current);
    });

    emails?.forEach(email => {
      const date = new Date(email.created_at).toISOString().split('T')[0];
      const current = trendMap.get(date) || { sms: 0, email: 0 };
      current.email += 1;
      trendMap.set(date, current);
    });

    return Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      sms: data.sms,
      email: data.email,
      total: data.sms + data.email,
    }));
  } catch (error) {
    console.error('Error fetching trend data:', error);
    return [];
  }
}