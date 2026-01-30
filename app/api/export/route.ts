/**
 * API Route: Export Data
 * Generates CSV, JSON, and HTML (printable PDF) exports
 * @vercel Edge Runtime enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateExport, ExportOptions } from '@/lib/export';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ExportOptions['type'];
    const format = (searchParams.get('format') || 'csv') as ExportOptions['format'];
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    if (!type) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Export type is required. Options: summaries, drafts, emails, activity, daily_summary. Formats: csv, json, html (for PDF printing)' 
      }, { status: 400 });
    }

    const validFormats = ['csv', 'json', 'html'];
    if (!validFormats.includes(format)) {
      return NextResponse.json({ 
        ok: false, 
        error: `Invalid format. Options: ${validFormats.join(', ')}` 
      }, { status: 400 });
    }

    const validTypes = ['summaries', 'drafts', 'emails', 'activity', 'daily_summary'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        ok: false, 
        error: `Invalid type. Options: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }

    const result = await generateExport({
      type,
      format,
      startDate,
      endDate,
      limit,
    });

    const headers = new Headers();
    headers.set('Content-Type', result.contentType);
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);
    headers.set('X-Record-Count', result.recordCount.toString());

    return new Response(result.data, { headers });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Export failed' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, format = 'csv', startDate, endDate, limit } = body;

    if (!type) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Export type is required. Options: summaries, drafts, emails, activity, daily_summary' 
      }, { status: 400 });
    }

    const validTypes = ['summaries', 'drafts', 'emails', 'activity', 'daily_summary'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        ok: false, 
        error: `Invalid type. Options: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }

    const validFormats = ['csv', 'json', 'html'];
    if (!validFormats.includes(format)) {
      return NextResponse.json({ 
        ok: false, 
        error: `Invalid format. Options: ${validFormats.join(', ')}` 
      }, { status: 400 });
    }

    const result = await generateExport({
      type,
      format,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json({
      ok: true,
      filename: result.filename,
      recordCount: result.recordCount,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Export failed' 
    }, { status: 500 });
  }
}
