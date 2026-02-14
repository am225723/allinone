/**
 * Advanced Search & Filtering
 * Unified search across OpenPhone and Gmail communications
 */

import { supabaseServer as supabase } from './supabase';

export interface SearchParams {
  query?: string;
  channel?: 'all' | 'openphone' | 'gmail';
  dateRange?: {
    start: Date;
    end: Date;
  };
  priority?: 'high' | 'normal' | 'low';
  status?: 'pending' | 'approved' | 'sent' | 'rejected';
  needsResponse?: boolean;
  tags?: string[];
}

export interface SearchResult {
  id: string;
  type: 'openphone' | 'gmail';
  title: string;
  preview: string;
  timestamp: string;
  priority?: 'high' | 'normal' | 'low';
  status?: string;
  needsResponse?: boolean;
  tags?: string[];
  metadata?: any;
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  params: SearchParams;
  icon?: string;
  color?: string;
}

/**
 * Search across all communications
 */
export async function searchCommunications(params: SearchParams): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // Search OpenPhone if applicable
  if (params.channel === 'all' || params.channel === 'openphone') {
    const openphoneResults = await searchOpenPhone(params);
    results.push(...openphoneResults);
  }

  // Search Gmail if applicable
  if (params.channel === 'all' || params.channel === 'gmail') {
    const gmailResults = await searchGmail(params);
    results.push(...gmailResults);
  }

  // Sort by timestamp (most recent first)
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return results;
}

/**
 * Search OpenPhone conversations
 */
async function searchOpenPhone(params: SearchParams): Promise<SearchResult[]> {
  try {
    let query = supabase
      .from('summaries')
      .select('*, draft_replies(status)');

    // Apply filters
    if (params.dateRange) {
      query = query
        .gte('created_at', params.dateRange.start.toISOString())
        .lte('created_at', params.dateRange.end.toISOString());
    }

    if (params.needsResponse !== undefined) {
      query = query.eq('needs_response', params.needsResponse);
    }

    // Text search in summary
    if (params.query) {
      query = query.ilike('summary', `%${params.query}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      type: 'openphone' as const,
      title: item.phone_number || 'Unknown',
      preview: item.summary || '',
      timestamp: item.created_at,
      needsResponse: item.needs_response,
      status: item.draft_replies?.[0]?.status,
      tags: item.topics || [],
      metadata: {
        phoneNumber: item.phone_number,
        conversationId: item.conversation_id,
      },
    }));
  } catch (error) {
    console.error('Error searching OpenPhone:', error);
    return [];
  }
}

/**
 * Search Gmail emails
 */
async function searchGmail(params: SearchParams): Promise<SearchResult[]> {
  try {
    let query = supabase
      .from('email_logs')
      .select('*');

    // Apply filters
    if (params.dateRange) {
      query = query
        .gte('created_at', params.dateRange.start.toISOString())
        .lte('created_at', params.dateRange.end.toISOString());
    }

    if (params.priority) {
      query = query.eq('priority', params.priority);
    }

    if (params.needsResponse !== undefined) {
      query = query.eq('needs_response', params.needsResponse);
    }

    // Text search in subject or summary
    if (params.query) {
      query = query.or(`subject.ilike.%${params.query}%,summary.ilike.%${params.query}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      type: 'gmail' as const,
      title: item.subject || 'No Subject',
      preview: item.summary || '',
      timestamp: item.created_at,
      priority: item.priority,
      needsResponse: item.needs_response,
      tags: item.proposed_labels || [],
      metadata: {
        from: item.from_email,
        to: item.to_email,
        messageId: item.message_id,
      },
    }));
  } catch (error) {
    console.error('Error searching Gmail:', error);
    return [];
  }
}

/**
 * Get predefined smart filters
 */
export function getSmartFilters(): SavedFilter[] {
  return [
    {
      id: 'urgent',
      name: 'Urgent',
      description: 'High priority items needing immediate attention',
      params: {
        priority: 'high',
        needsResponse: true,
      },
      icon: 'priority_high',
      color: 'red',
    },
    {
      id: 'unread',
      name: 'Needs Response',
      description: 'All communications requiring a response',
      params: {
        needsResponse: true,
      },
      icon: 'mark_email_unread',
      color: 'amber',
    },
    {
      id: 'today',
      name: 'Today',
      description: 'Communications from today',
      params: {
        dateRange: {
          start: new Date(new Date().setHours(0, 0, 0, 0)),
          end: new Date(),
        },
      },
      icon: 'today',
      color: 'blue',
    },
    {
      id: 'this-week',
      name: 'This Week',
      description: 'Communications from the past 7 days',
      params: {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      },
      icon: 'date_range',
      color: 'purple',
    },
    {
      id: 'openphone-pending',
      name: 'SMS Pending',
      description: 'OpenPhone drafts awaiting review',
      params: {
        channel: 'openphone',
        status: 'pending',
      },
      icon: 'phone',
      color: 'emerald',
    },
    {
      id: 'gmail-high-priority',
      name: 'High Priority Emails',
      description: 'Important emails requiring attention',
      params: {
        channel: 'gmail',
        priority: 'high',
      },
      icon: 'mail',
      color: 'blue',
    },
  ];
}

/**
 * Save a custom filter
 */
export async function saveCustomFilter(filter: Omit<SavedFilter, 'id'>): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('saved_filters')
      .insert({
        name: filter.name,
        description: filter.description,
        params: filter.params,
        icon: filter.icon,
        color: filter.color,
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error('Error saving filter:', error);
    throw error;
  }
}

/**
 * Get user's saved filters
 */
export async function getSavedFilters(): Promise<SavedFilter[]> {
  try {
    const { data, error } = await supabase
      .from('saved_filters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching saved filters:', error);
    return [];
  }
}

/**
 * Delete a saved filter
 */
export async function deleteFilter(filterId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('saved_filters')
      .delete()
      .eq('id', filterId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting filter:', error);
    throw error;
  }
}

/**
 * Get search suggestions based on query
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];

  try {
    // Get recent searches from summaries and emails
    const [{ data: summaries }, { data: emails }] = await Promise.all([
      supabase
        .from('summaries')
        .select('summary, topics')
        .ilike('summary', `%${query}%`)
        .limit(5),
      supabase
        .from('email_logs')
        .select('subject, proposed_labels')
        .ilike('subject', `%${query}%`)
        .limit(5),
    ]);

    const suggestions = new Set<string>();

    // Extract keywords from summaries
    summaries?.forEach(s => {
      if (s.topics) {
        s.topics.forEach((topic: string) => {
          if (topic.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(topic);
          }
        });
      }
    });

    // Extract keywords from email subjects
    emails?.forEach(e => {
      if (e.subject) {
        const words = e.subject.split(' ').filter((w: string) => 
          w.toLowerCase().includes(query.toLowerCase()) && w.length > 3
        );
        words.forEach((word: string) => suggestions.add(word));
      }
    });

    return Array.from(suggestions).slice(0, 5);
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}