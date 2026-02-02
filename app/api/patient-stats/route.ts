import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const now = new Date();
  const today = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const payload = {
    notesPending: 6,
    appointmentsThisWeek: 14,
    appointmentsToday: 3,
    topIcd10: [
      { code: 'F41.1', label: 'Generalized anxiety disorder', count: 5 },
      { code: 'F33.1', label: 'Major depressive disorder, recurrent', count: 3 },
      { code: 'F90.0', label: 'ADHD, predominantly inattentive', count: 2 },
    ],
    appointmentsTodayList: {
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
