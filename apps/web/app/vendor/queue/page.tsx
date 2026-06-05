'use client';

import { useState, useMemo } from 'react';
import type { Booking } from '@/lib/api/bookings';
import { motion, AnimatePresence } from 'framer-motion';
import { List, CheckCircle, XCircle, Clock, CalendarDays, User } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/auth/hooks';
import { useBookings } from '@/lib/api/hooks';
import { updateBookingStatus } from '@/lib/api/bookings';
import { cn } from '@/lib/utils';

const columns = [
  { id: 'pending', label: 'New', color: 'text-gold', bg: 'bg-gold/10' },
  { id: 'confirmed', label: 'Accepted', color: 'text-teal', bg: 'bg-teal/10' },
  { id: 'completed', label: 'Completed', color: 'text-purple-accent', bg: 'bg-purple-accent/10' },
];

function QueueCard({
  booking,
  onAccept,
  onDecline,
}: {
  booking: Booking;
  onAccept?: (id: number) => void;
  onDecline?: (id: number) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-dark rounded-lg p-3 border border-white/5 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted font-mono">
          #{booking.booking_number ?? booking.id}
        </span>
        <span
          className={cn(
            'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
            booking.status === 'Pending'
              ? 'bg-gold/10 text-gold'
              : booking.status === 'Confirmed'
                ? 'bg-teal/10 text-teal'
                : 'bg-purple-accent/10 text-purple-accent'
          )}
        >
          {booking.status}
        </span>
      </div>

      <div>
        <p className="text-lr-white text-xs font-semibold">
          {booking.service_name ?? `Service #${booking.service_id}`}
        </p>
        <p className="text-muted text-[10px] flex items-center gap-1 mt-0.5">
          <User size={8} /> {booking.customer_name ?? `Customer #${booking.customer_id}`}
        </p>
        {booking.address && (
          <p className="text-muted text-[10px] truncate mt-0.5">{booking.address}</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted">
        <span className="flex items-center gap-0.5">
          <CalendarDays size={8} /> {booking.booking_date?.split('T')[0]}
        </span>
        <span className="flex items-center gap-0.5">
          <Clock size={8} /> {booking.start_time?.slice(0, 5)}
        </span>
      </div>

      <p className="text-gold text-[11px] font-bold">
        ${parseFloat(booking.final_price ?? booking.price ?? '0').toFixed(0)}
      </p>

      {booking.status === 'Pending' && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onAccept?.(booking.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-semibold bg-teal/10 text-teal hover:bg-teal/20 transition-colors"
          >
            <CheckCircle size={10} /> Accept
          </button>
          <button
            type="button"
            onClick={() => onDecline?.(booking.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-semibold bg-rose/10 text-rose hover:bg-rose/20 transition-colors"
          >
            <XCircle size={10} /> Decline
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function VendorQueuePage() {
  const { profile } = useAuth();
  const { bookings: apiBookings, isLoading, refresh } = useBookings();
  const [actingId, setActingId] = useState<number | null>(null);

  const isLive = apiBookings.length > 0;

  const grouped = useMemo(() => {
    const result: Record<string, Booking[]> = { pending: [], confirmed: [], completed: [] };
    apiBookings.forEach((b) => {
      const key =
        b.status === 'Pending'
          ? 'pending'
          : b.status === 'Confirmed'
            ? 'confirmed'
            : b.status === 'Completed'
              ? 'completed'
              : null;
      if (key) result[key].push(b);
    });
    return result;
  }, [apiBookings]);

  const handleAccept = async (id: number) => {
    if (!profile?.role || actingId) return;
    setActingId(id);
    try {
      await updateBookingStatus(profile.role, id, 'Confirmed');
      refresh();
    } catch (err: unknown) {
      console.error('Accept failed:', err instanceof Error ? err.message : String(err));
    } finally {
      setActingId(null);
    }
  };

  const handleDecline = async (id: number) => {
    if (!profile?.role || actingId) return;
    setActingId(id);
    try {
      await updateBookingStatus(profile.role, id, 'Cancelled');
      refresh();
    } catch (err: unknown) {
      console.error('Decline failed:', err instanceof Error ? err.message : String(err));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-lr-white text-xl flex items-center gap-2">
          <List size={20} className="text-gold" /> Booking Queue
        </h1>
        {isLive && (
          <span className="text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded-full">
            Live data
          </span>
        )}
        {!isLive && !isLoading && (
          <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">
            Demo data
          </span>
        )}
      </div>

      {apiBookings.length === 0 && !isLoading ? (
        <EmptyState
          icon={<List className="h-6 w-6 text-muted" />}
          title="No bookings yet"
          description="Your booking queue will appear here when customers book your services."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('w-2 h-2 rounded-full', col.bg.replace('/10', ''))} />
                <h2 className={cn('text-xs font-bold uppercase tracking-wider', col.color)}>
                  {col.label}
                </h2>
                <span className="text-[10px] text-muted ml-auto">
                  {grouped[col.id]?.length ?? 0}
                </span>
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {grouped[col.id]?.map((b) => (
                    <QueueCard
                      key={b.id}
                      booking={b}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
