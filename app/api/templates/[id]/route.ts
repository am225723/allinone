/**
 * API Route: Template by ID
 * @vercel Edge Runtime enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { 
  getTemplate, 
  updateTemplate, 
  deleteTemplate,
  useTemplate,
  fillTemplate 
} from '@/lib/templates';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await getTemplate(params.id);
    
    if (!template) {
      return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, template });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, content, category, is_default } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (is_default !== undefined) updates.is_default = is_default;

    const template = await updateTemplate(params.id, updates);

    if (!template) {
      return NextResponse.json({ ok: false, error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, template });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteTemplate(params.id);

    if (!success) {
      return NextResponse.json({ ok: false, error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { variables } = body;

    const content = await useTemplate(params.id, variables);

    if (!content) {
      return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, content });
  } catch (error: any) {
    console.error('Error using template:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
