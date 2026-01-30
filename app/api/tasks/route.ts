import { NextRequest, NextResponse } from 'next/server';
import { fetchTasks, createTask, bulkUpdateTasks, bulkDeleteTasks } from '@/lib/tasks';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: any = {};
    
    const status = searchParams.get('status');
    if (status) {
      filters.status = status.includes(',') ? status.split(',') : status;
    }
    
    const priority = searchParams.get('priority');
    if (priority) {
      filters.priority = priority.includes(',') ? priority.split(',') : priority;
    }
    
    const tags = searchParams.get('tags');
    if (tags) {
      filters.tags = tags.split(',');
    }
    
    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }
    
    const assigned_to = searchParams.get('assigned_to');
    if (assigned_to) {
      filters.assigned_to = assigned_to;
    }

    const result = await fetchTasks(filters);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'bulk_update') {
      const result = await bulkUpdateTasks(body.ids, body.updates);
      return NextResponse.json(result);
    }
    
    if (body.action === 'bulk_delete') {
      const result = await bulkDeleteTasks(body.ids);
      return NextResponse.json(result);
    }
    
    const result = await createTask(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
