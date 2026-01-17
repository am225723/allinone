/**
 * OpenPhone API Client
 * Handles all interactions with the OpenPhone API for SMS/Voice communications
 */

const BASE = 'https://api.openphone.com/v1';

function headers() {
  const key = process.env.OPENPHONE_API_KEY;
  if (!key) throw new Error('Missing OPENPHONE_API_KEY');
  return { Authorization: key, 'Content-Type': 'application/json' };
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(body) 
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface ConversationParams {
  updatedAfter: string;
  updatedBefore: string;
  maxResults?: number;
  pageToken?: string | null;
}

export interface MessageParams {
  phoneNumberId: string;
  participants: string[];
  createdAfter: string;
  createdBefore: string;
  pageToken?: string | null;
}

export interface SendMessageParams {
  content: string;
  from: string;
  to: string;
  userId?: string | null;
  setInboxStatus?: 'done';
}

/**
 * List conversations within a date range
 */
export async function listConversations(params: ConversationParams) {
  const u = new URL(BASE + '/conversations');
  u.searchParams.set('updatedAfter', params.updatedAfter);
  u.searchParams.set('updatedBefore', params.updatedBefore);
  u.searchParams.set('maxResults', String(params.maxResults ?? 100));
  if (params.pageToken) u.searchParams.set('pageToken', params.pageToken);
  return getJson(u.toString());
}

/**
 * List messages for a specific conversation
 */
export async function listMessages(params: MessageParams) {
  const u = new URL(BASE + '/messages');
  u.searchParams.set('phoneNumberId', params.phoneNumberId);
  params.participants.forEach(p => u.searchParams.append('participants', p));
  u.searchParams.set('createdAfter', params.createdAfter);
  u.searchParams.set('createdBefore', params.createdBefore);
  u.searchParams.set('maxResults', '100');
  if (params.pageToken) u.searchParams.set('pageToken', params.pageToken);
  return getJson(u.toString());
}

/**
 * Send a text message via OpenPhone
 */
export async function sendTextMessage(args: SendMessageParams) {
  return postJson(BASE + '/messages', {
    content: args.content,
    from: args.from,
    to: [args.to],
    userId: args.userId ?? undefined,
    setInboxStatus: args.setInboxStatus ?? undefined
  });
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string) {
  return getJson(BASE + '/conversations/' + conversationId);
}

/**
 * Get phone number details
 */
export async function getPhoneNumber(phoneNumberId: string) {
  return getJson(BASE + '/phone-numbers/' + phoneNumberId);
}

/**
 * List all phone numbers
 */
export async function listPhoneNumbers() {
  return getJson(BASE + '/phone-numbers');
}