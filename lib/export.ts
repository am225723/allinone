/**
 * Export Service
 * Generates CSV and PDF exports for reports
 */
import { supabaseServer } from './supabase';

export interface ExportOptions {
  type: 'summaries' | 'drafts' | 'emails' | 'activity' | 'daily_summary';
  format: 'csv' | 'json' | 'html';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

interface ExportResult {
  data: string;
  filename: string;
  contentType: string;
  recordCount: number;
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(data: any[], columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => escapeCSV(row[col])).join(',')
  );
  return [header, ...rows].join('\n');
}

function toHTML(data: any[], columns: string[], title: string): string {
  const columnHeaders = columns.map(col => 
    col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );
  
  const headerRow = columnHeaders.map(h => `<th>${h}</th>`).join('');
  const bodyRows = data.map(row => 
    `<tr>${columns.map(col => `<td>${escapeHTML(row[col])}</td>`).join('')}</tr>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 20px;
      color: #333;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 2px solid #e5e5e5;
      padding-bottom: 10px;
    }
    .meta {
      color: #666;
      margin-bottom: 20px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 12px;
    }
    th {
      background: #f5f5f5;
      text-align: left;
      padding: 12px 8px;
      border: 1px solid #ddd;
      font-weight: 600;
    }
    td {
      padding: 10px 8px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #f0f0f0; }
    .print-btn {
      background: #0066cc;
      color: white;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      border-radius: 4px;
      font-size: 14px;
    }
    .print-btn:hover { background: #0052a3; }
    .summary { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <h1>${title}</h1>
  <div class="meta">
    <p>Generated: ${new Date().toLocaleString()}</p>
    <p>Total Records: ${data.length}</p>
  </div>
  <table>
    <thead>
      <tr>${headerRow}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
  <div class="summary">
    <strong>Report Summary:</strong> ${data.length} records exported.
  </div>
</body>
</html>`;
}

function escapeHTML(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: string | Date): string {
  return new Date(date).toISOString().split('T')[0];
}

export async function exportSummaries(options: ExportOptions): Promise<ExportResult> {
  let query = supabaseServer
    .from('summaries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit || 1000);

  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const records = (data || []).map(row => ({
    id: row.id,
    conversation_id: row.conversation_id,
    contact_name: row.contact_name,
    phone: row.phone,
    date_range: row.date_range,
    summary: row.summary,
    topics: Array.isArray(row.topics) ? row.topics.join('; ') : row.topics,
    needs_response: row.needs_response ? 'Yes' : 'No',
    suppress_response: row.suppress_response ? 'Yes' : 'No',
    last_inbound: row.last_inbound,
    last_outbound: row.last_outbound,
    last_message_at: row.last_message_at,
    needs_response_reason: row.needs_response_reason,
    created_at: row.created_at,
  }));

  const columns = [
    'id', 'conversation_id', 'contact_name', 'phone', 'date_range',
    'summary', 'topics', 'needs_response', 'suppress_response',
    'last_inbound', 'last_outbound', 'last_message_at',
    'needs_response_reason', 'created_at'
  ];

  const dateStr = formatDate(new Date());

  if (options.format === 'json') {
    return {
      data: JSON.stringify(records, null, 2),
      filename: `summaries_${dateStr}.json`,
      contentType: 'application/json',
      recordCount: records.length,
    };
  }

  if (options.format === 'html') {
    return {
      data: toHTML(records, columns, 'Conversation Summaries Report'),
      filename: `summaries_${dateStr}.html`,
      contentType: 'text/html',
      recordCount: records.length,
    };
  }

  return {
    data: toCSV(records, columns),
    filename: `summaries_${dateStr}.csv`,
    contentType: 'text/csv',
    recordCount: records.length,
  };
}

export async function exportDrafts(options: ExportOptions): Promise<ExportResult> {
  let query = supabaseServer
    .from('draft_replies')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit || 1000);

  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const records = (data || []).map(row => ({
    id: row.id,
    run_id: row.run_id,
    conversation_id: row.conversation_id,
    phone: row.phone,
    from_phone_number_id: row.from_phone_number_id,
    draft_text: row.draft_text,
    status: row.status,
    suppressed: row.suppressed ? 'Yes' : 'No',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const columns = [
    'id', 'run_id', 'conversation_id', 'phone', 'from_phone_number_id',
    'draft_text', 'status', 'suppressed', 'created_at', 'updated_at'
  ];

  const dateStr = formatDate(new Date());

  if (options.format === 'json') {
    return {
      data: JSON.stringify(records, null, 2),
      filename: `drafts_${dateStr}.json`,
      contentType: 'application/json',
      recordCount: records.length,
    };
  }

  if (options.format === 'html') {
    return {
      data: toHTML(records, columns, 'Draft Replies Report'),
      filename: `drafts_${dateStr}.html`,
      contentType: 'text/html',
      recordCount: records.length,
    };
  }

  return {
    data: toCSV(records, columns),
    filename: `drafts_${dateStr}.csv`,
    contentType: 'text/csv',
    recordCount: records.length,
  };
}

export async function exportEmails(options: ExportOptions): Promise<ExportResult> {
  let query = supabaseServer
    .from('email_logs')
    .select('*, gmail_accounts(email)')
    .order('created_at', { ascending: false })
    .limit(options.limit || 1000);

  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const records = (data || []).map((row: any) => ({
    id: row.id,
    gmail_account: row.gmail_accounts?.email || '',
    gmail_message_id: row.gmail_message_id,
    subject: row.subject,
    from_address: row.from_address,
    summary: row.summary,
    needs_response: row.needs_response ? 'Yes' : 'No',
    priority: row.priority,
    draft_created: row.draft_created ? 'Yes' : 'No',
    created_at: row.created_at,
  }));

  const columns = [
    'id', 'gmail_account', 'gmail_message_id', 'subject', 'from_address',
    'summary', 'needs_response', 'priority', 'draft_created', 'created_at'
  ];

  const dateStr = formatDate(new Date());

  if (options.format === 'json') {
    return {
      data: JSON.stringify(records, null, 2),
      filename: `emails_${dateStr}.json`,
      contentType: 'application/json',
      recordCount: records.length,
    };
  }

  if (options.format === 'html') {
    return {
      data: toHTML(records, columns, 'Email Activity Report'),
      filename: `emails_${dateStr}.html`,
      contentType: 'text/html',
      recordCount: records.length,
    };
  }

  return {
    data: toCSV(records, columns),
    filename: `emails_${dateStr}.csv`,
    contentType: 'text/csv',
    recordCount: records.length,
  };
}

export async function exportActivityLog(options: ExportOptions): Promise<ExportResult> {
  const [summaries, drafts, emails] = await Promise.all([
    supabaseServer
      .from('summaries')
      .select('id, contact_name, phone, needs_response, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseServer
      .from('draft_replies')
      .select('id, phone, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseServer
      .from('email_logs')
      .select('id, subject, from_address, needs_response, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const activities: any[] = [];

  (summaries.data || []).forEach(row => {
    activities.push({
      timestamp: row.created_at,
      type: 'OpenPhone Summary',
      description: `Conversation with ${row.contact_name || row.phone}`,
      details: row.needs_response ? 'Needs response' : 'No action needed',
      reference_id: row.id,
    });
  });

  (drafts.data || []).forEach(row => {
    activities.push({
      timestamp: row.created_at,
      type: 'Draft Reply',
      description: `Draft for ${row.phone}`,
      details: `Status: ${row.status}`,
      reference_id: row.id,
    });
  });

  (emails.data || []).forEach(row => {
    activities.push({
      timestamp: row.created_at,
      type: 'Email Processed',
      description: row.subject || '(no subject)',
      details: `From: ${row.from_address}`,
      reference_id: row.id,
    });
  });

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const columns = ['timestamp', 'type', 'description', 'details', 'reference_id'];
  const dateStr = formatDate(new Date());

  if (options.format === 'json') {
    return {
      data: JSON.stringify(activities, null, 2),
      filename: `activity_log_${dateStr}.json`,
      contentType: 'application/json',
      recordCount: activities.length,
    };
  }

  if (options.format === 'html') {
    return {
      data: toHTML(activities, columns, 'Activity Log Report'),
      filename: `activity_log_${dateStr}.html`,
      contentType: 'text/html',
      recordCount: activities.length,
    };
  }

  return {
    data: toCSV(activities, columns),
    filename: `activity_log_${dateStr}.csv`,
    contentType: 'text/csv',
    recordCount: activities.length,
  };
}

export async function exportDailySummary(options: ExportOptions): Promise<ExportResult> {
  let query = supabaseServer
    .from('daily_summaries')
    .select('*')
    .order('date', { ascending: false })
    .limit(options.limit || 90);

  if (options.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('date', options.endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const records = (data || []).map(row => {
    const stats = row.stats || {};
    return {
      date: row.date,
      total_conversations: stats.totalConversations || 0,
      needs_response: stats.needsResponse || 0,
      drafts_created: stats.draftsCreated || 0,
      drafts_sent: stats.draftsSent || 0,
      drafts_approved: stats.draftsApproved || 0,
      emails_processed: stats.emailsProcessed || 0,
      email_drafts_created: stats.emailDraftsCreated || 0,
      created_at: row.created_at,
    };
  });

  const columns = [
    'date', 'total_conversations', 'needs_response', 'drafts_created',
    'drafts_sent', 'drafts_approved', 'emails_processed', 'email_drafts_created', 'created_at'
  ];

  const dateStr = formatDate(new Date());

  if (options.format === 'json') {
    return {
      data: JSON.stringify(records, null, 2),
      filename: `daily_summary_${dateStr}.json`,
      contentType: 'application/json',
      recordCount: records.length,
    };
  }

  if (options.format === 'html') {
    return {
      data: toHTML(records, columns, 'Daily Summary Report'),
      filename: `daily_summary_${dateStr}.html`,
      contentType: 'text/html',
      recordCount: records.length,
    };
  }

  return {
    data: toCSV(records, columns),
    filename: `daily_summary_${dateStr}.csv`,
    contentType: 'text/csv',
    recordCount: records.length,
  };
}

export async function generateExport(options: ExportOptions): Promise<ExportResult> {
  switch (options.type) {
    case 'summaries':
      return exportSummaries(options);
    case 'drafts':
      return exportDrafts(options);
    case 'emails':
      return exportEmails(options);
    case 'activity':
      return exportActivityLog(options);
    case 'daily_summary':
      return exportDailySummary(options);
    default:
      throw new Error('Invalid export type');
  }
}
