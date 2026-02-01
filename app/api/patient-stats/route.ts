import { NextResponse } from 'next/server';

/**
 * Patient dashboard metrics (stub v1)
 *
 * This endpoint intentionally returns a sensible sample payload so the UI can be
 * built and wired immediately.
 *
 * Next steps (when you're ready):
 * - Store imported calendar sources (URL/iCal) per user
 * - Parse + normalize to a canonical appointments table
 * - Derive ICD-10 from generated notes and aggregate here
 */

export async function GET() {
  const now = new Date();
  const today = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  // Sample payload
  const payload = {
    notesPending: 6,
    appointmentsThisWeek: 14,
    topIcd10: [
      { code: 'F41.1', label: 'Generalized anxiety disorder', count: 5 },
      { code: 'F33.1', label: 'Major depressive disorder, recurrent', count: 3 },
      { code: 'F90.0', label: 'ADHD, predominantly inattentive', count: 2 },
    ],
    appointmentsToday: {
      dateLabel: today,
      items: [
        { time: '9:00 AM', patient: 'Alex Morgan', type: 'Follow-up' },
        { time: '11:30 AM', patient: 'Jordan Lee', type: 'Initial Intake' },
        { time: '3:15 PM', patient: 'Sam Patel', type: 'Medication Mgmt' },
      ],
    },
  };

  return NextResponse.json({ ok: true, stats: payload });
}
