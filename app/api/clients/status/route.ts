import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json({ ok: false, error: 'ID and status are required' }, { status: 400 });
    }
    
    const validStatuses = ['active', 'inactive', 'archived', 'pending'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
    }
    
    const { data: client, error } = await supabaseServer
      .from('clients')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating client status:', error);
      return NextResponse.json({ ok: false, error: 'Failed to update status' }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true, client });
  } catch (err) {
    console.error('Error in status route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}
