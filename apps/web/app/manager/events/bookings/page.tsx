'use client';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Construction } from 'lucide-react';

export default function Page() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <SectionHeader title="Event Bookings" subtitle="Coming soon" />
      <EmptyState
        icon={<Construction />}
        title="Event Bookings"
        description="This section is under construction and will be wired to live data in the next phase."
      />
    </div>
  );
}
