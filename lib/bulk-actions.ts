/**
 * Bulk Actions
 * Handle batch operations for drafts and communications
 */

import { supabaseServer as supabase } from './supabase';

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Bulk approve OpenPhone drafts
 */
export async function bulkApproveDrafts(draftIds: string[]): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const draftId of draftIds) {
    try {
      const { error } = await supabase
        .from('draft_replies')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', draftId);

      if (error) throw error;
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Failed to approve draft ${draftId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Bulk reject OpenPhone drafts
 */
export async function bulkRejectDrafts(draftIds: string[]): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const draftId of draftIds) {
    try {
      const { error } = await supabase
        .from('draft_replies')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', draftId);

      if (error) throw error;
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Failed to reject draft ${draftId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Bulk delete OpenPhone drafts
 */
export async function bulkDeleteDrafts(draftIds: string[]): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const draftId of draftIds) {
    try {
      const { error } = await supabase
        .from('draft_replies')
        .delete()
        .eq('id', draftId);

      if (error) throw error;
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Failed to delete draft ${draftId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Bulk mark emails as processed
 */
export async function bulkMarkEmailsProcessed(emailIds: string[]): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const emailId of emailIds) {
    try {
      const { error } = await supabase
        .from('email_logs')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', emailId);

      if (error) throw error;
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Failed to mark email ${emailId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Bulk update priority
 */
export async function bulkUpdatePriority(
  ids: string[],
  type: 'email' | 'draft',
  priority: 'high' | 'normal' | 'low'
): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  const table = type === 'email' ? 'email_logs' : 'draft_replies';

  for (const id of ids) {
    try {
      const { error } = await supabase
        .from(table)
        .update({ priority })
        .eq('id', id);

      if (error) throw error;
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Failed to update priority for ${id}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Bulk add tags/labels
 */
export async function bulkAddTags(
  ids: string[],
  type: 'summary' | 'email',
  tags: string[]
): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  const table = type === 'summary' ? 'summaries' : 'email_logs';
  const column = type === 'summary' ? 'topics' : 'proposed_labels';

  for (const id of ids) {
    try {
      // Get existing tags
      const { data: existing } = await supabase
        .from(table)
        .select(column)
        .eq('id', id)
        .single();

      const existingTags = (existing as any)?.[column] || [];
      const newTags = [...new Set([...existingTags, ...tags])];

      const updateData: any = {};
      updateData[column] = newTags;

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Failed to add tags to ${id}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Bulk archive conversations
 */
export async function bulkArchiveConversations(conversationIds: string[]): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const conversationId of conversationIds) {
    try {
      const { error } = await supabase
        .from('summaries')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('conversation_id', conversationId);

      if (error) throw error;
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Failed to archive conversation ${conversationId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Bulk send approved drafts
 */
export async function bulkSendApprovedDrafts(draftIds: string[]): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // This would integrate with the actual OpenPhone API
  // For now, we'll just mark them as sent in the database
  for (const draftId of draftIds) {
    try {
      // Get draft details
      const { data: draft } = await supabase
        .from('draft_replies')
        .select('*')
        .eq('id', draftId)
        .eq('status', 'approved')
        .single();

      if (!draft) {
        throw new Error('Draft not found or not approved');
      }

      // TODO: Send via OpenPhone API
      // await sendSMS(draft.phone_number, draft.draft_reply);

      // Mark as sent
      const { error } = await supabase
        .from('draft_replies')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', draftId);

      if (error) throw error;
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Failed to send draft ${draftId}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Get bulk action statistics
 */
export async function getBulkActionStats() {
  try {
    const [
      { count: pendingDrafts },
      { count: approvedDrafts },
      { count: unprocessedEmails },
    ] = await Promise.all([
      supabase.from('draft_replies').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('draft_replies').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('processed', false),
    ]);

    return {
      pendingDrafts: pendingDrafts || 0,
      approvedDrafts: approvedDrafts || 0,
      unprocessedEmails: unprocessedEmails || 0,
    };
  } catch (error) {
    console.error('Error getting bulk action stats:', error);
    return {
      pendingDrafts: 0,
      approvedDrafts: 0,
      unprocessedEmails: 0,
    };
  }
}