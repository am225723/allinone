/**
 * API Route: Register Push Notification Device
 * 
 * IMPORTANT: This is a server-to-server endpoint.
 * Client devices should register via your backend, not directly.
 * The backend should call this endpoint with the PUSH_API_SECRET.
 * 
 * Flow: Mobile App -> Your Backend -> This API -> OneSignal
 * 
 * @vercel Edge Runtime enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { registerDevice } from '@/lib/onesignal';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-api-key');
    const appToken = process.env.PUSH_API_SECRET;
    
    if (!appToken || authHeader !== appToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId, userId, deviceInfo } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
    }

    await registerDevice(playerId, userId);

    await supabaseServer.from('push_devices').upsert({
      player_id: playerId,
      user_id: userId || null,
      device_info: deviceInfo || {},
      last_seen: new Date().toISOString(),
      is_active: true,
    }, { onConflict: 'player_id' });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Push registration error:', error);
    return NextResponse.json({ error: error?.message || 'Registration failed' }, { status: 500 });
  }
}
