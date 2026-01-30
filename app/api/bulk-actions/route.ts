/**
 * API Route: Bulk Actions
 * @vercel Edge Runtime enabled
 */

import { NextResponse } from 'next/server';
import {
  bulkApproveDrafts,
  bulkRejectDrafts,
  bulkDeleteDrafts,
  bulkMarkEmailsProcessed,
  bulkUpdatePriority,
  bulkAddTags,
  bulkArchiveConversations,
  bulkSendApprovedDrafts,
} from '@/lib/bulk-actions';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { action, ids, type, data } = await request.json();

    let result;

    switch (action) {
      case 'approve':
        result = await bulkApproveDrafts(ids);
        break;

      case 'reject':
        result = await bulkRejectDrafts(ids);
        break;

      case 'delete':
        result = await bulkDeleteDrafts(ids);
        break;

      case 'mark-processed':
        result = await bulkMarkEmailsProcessed(ids);
        break;

      case 'update-priority':
        result = await bulkUpdatePriority(ids, type, data.priority);
        break;

      case 'add-tags':
        result = await bulkAddTags(ids, type, data.tags);
        break;

      case 'archive':
        result = await bulkArchiveConversations(ids);
        break;

      case 'send-approved':
        result = await bulkSendApprovedDrafts(ids);
        break;

      default:
        return NextResponse.json(
          { ok: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Bulk action failed' },
      { status: 500 }
    );
  }
}