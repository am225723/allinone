/**
 * API Route: Message Templates
 * @vercel Edge Runtime enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { 
  getTemplates, 
  createTemplate, 
  getCategories,
  initializeDefaultTemplates 
} from '@/lib/templates';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const type = searchParams.get('type');

    if (type === 'categories') {
      return NextResponse.json({ ok: true, categories: getCategories() });
    }

    if (type === 'init') {
      const count = await initializeDefaultTemplates();
      return NextResponse.json({ ok: true, initialized: count });
    }

    const templates = await getTemplates(category);
    return NextResponse.json({ ok: true, templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content, category, is_default } = body;

    if (!name || !content) {
      return NextResponse.json({ ok: false, error: 'Name and content are required' }, { status: 400 });
    }

    const template = await createTemplate({
      name,
      content,
      category: category || 'custom',
      variables: [],
      is_default: is_default || false,
    });

    if (!template) {
      return NextResponse.json({ ok: false, error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, template });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
