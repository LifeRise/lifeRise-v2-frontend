'use client';

import { AdminPageShell } from '@/components/admin';
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarDays } from 'lucide-react';

export default function CalendarPage() {
  return (
    <AdminPageShell title="Calendar" subtitle="Event & booking calendar">
      <EmptyState
        icon={<CalendarDays size={24} className="text-muted" />}
        title="Calendar View"
        description="Calendar integration is coming soon. Use the Events and Bookings pages to manage schedules."
      />
    </AdminPageShell>
  );
}
