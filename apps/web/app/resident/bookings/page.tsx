'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, Star, RotateCcw, XCircle, MapPin } from 'lucide-react';
import { bookingHistoryMap as mockBookingHistoryMap } from '@/lib/mock-data';
import type { ResidentBooking } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { staggerContainerResponsive, fadeUpItem } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useBookings } from '@/lib/api/hooks';
import { updateBookingStatus } from '@/lib/api/bookings';
import { useAuth } from '@/lib/auth/hooks';

const tabs = [
  { id: 'active', label: 'Active' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

function BookingRow({
  booking,
  tab,
  onCancel,
  onRebook,
}: {
  booking: ResidentBooking;
  tab: string;
  onCancel?: (id: string) => void;
  onRebook?: (b: ResidentBooking) => void;
}) {
  const [rating, setRating] = useState(booking.rating || 0);
  const statusColors: Record<string, string> = {
    confirmed: 'bg-teal',
    pending: 'bg-gold',
    completed: 'bg-purple-accent',
    cancelled: 'bg-red-400',
  };

  return (
    <motion.div variants={fadeUpItem} layout exit={{ opacity: 0, x: 20, scale: 0.98 }}>
      <GlassCard className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-midnight shrink-0',
              statusColors[booking.status] || 'bg-slate-light'
            )}
          >
            {booking.avatar}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lr-white text-sm font-semibold">{booking.service}</p>
                <p className="text-muted text-xs mt-0.5">{booking.vendor}</p>
              </div>
              <StatusBadge status={booking.status} variant="resident" />
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-muted text-[11px]">
              <span className="flex items-center gap-1">
                <CalendarDays size={10} /> {booking.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} /> {booking.time}
              </span>
              <span className="text-lr-white font-medium">{booking.amount}</span>
            </div>

            {/* Expanded history / actions */}
            {tab === 'active' && (
              <div className="flex items-center gap-2 mt-3">
                {booking.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onCancel?.(booking.id)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/6 text-muted hover:text-lr-white hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    <XCircle size={10} /> Cancel
                  </button>
                )}
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/6 text-muted hover:text-lr-white hover:bg-white/10 transition-colors flex items-center gap-1"
                >
                  <MapPin size={10} /> Reschedule
                </button>
              </div>
            )}

            {tab === 'past' && (
              <div className="mt-3">
                {booking.review && (
                  <p className="text-muted text-xs italic mb-2">&ldquo;{booking.review}&rdquo;</p>
                )}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      aria-label={`Rate ${s} star${s === 1 ? '' : 's'}`}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={14}
                        className={cn(s <= rating ? 'text-gold fill-gold' : 'text-slate-light')}
                      />
                    </button>
                  ))}
                  <span className="text-muted text-[10px] ml-2">
                    {rating > 0 ? 'Thanks for rating!' : 'Rate this service'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRebook?.(booking)}
                  className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-teal/10 text-teal hover:bg-teal/20 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Rebook
                </button>
              </div>
            )}

            {tab === 'cancelled' && booking.history && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-muted text-[11px]">
                  {booking.history[booking.history.length - 1]?.note}
                </p>
                <button
                  type="button"
                  onClick={() => onRebook?.(booking)}
                  className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-teal/10 text-teal hover:bg-teal/20 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Book Again
                </button>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState('active');
  const { profile } = useAuth();
  const { residentBookings: apiBookings, isLoading: apiLoading } = useBookings();

  // Use API data when available, fall back to mock data
  const bookingList = apiBookings.length > 0 ? apiBookings : Object.values(mockBookingHistoryMap);

  const activeBookings = useMemo(
    () => bookingList.filter((b) => b.status === 'confirmed' || b.status === 'pending'),
    [bookingList]
  );

  const pastBookings = useMemo(
    () => bookingList.filter((b) => b.status === 'completed'),
    [bookingList]
  );

  const cancelledBookings = useMemo(
    () => bookingList.filter((b) => b.status === 'cancelled'),
    [bookingList]
  );

  const tabMap: Record<string, ResidentBooking[]> = {
    active: activeBookings,
    past: pastBookings,
    cancelled: cancelledBookings,
  };

  const handleCancel = useCallback(
    async (id: string) => {
      // Try to cancel via API first
      if (profile?.role) {
        try {
          await updateBookingStatus(profile.role, Number(id), 'Cancelled');
        } catch {
          // fallback to local state
        }
      }
    },
    [profile]
  );

  const handleRebook = useCallback((b: ResidentBooking) => {
    // TODO: navigate to booking flow with pre-filled service
    console.log('Rebook', b);
  }, []);

  const currentBookings = tabMap[activeTab] || [];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-lr-white">My Bookings</h1>
        {apiBookings.length > 0 && (
          <span className="text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded-full">
            Live data
          </span>
        )}
        {apiBookings.length === 0 && !apiLoading && (
          <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">
            Demo data
          </span>
        )}
      </div>

      <Tabs tabs={tabs} defaultTab="active" onChange={setActiveTab}>
        {(tabId) => (
          <AnimatePresence mode="wait">
            <motion.div
              key={tabId}
              variants={staggerContainerResponsive(0.04)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="space-y-3"
            >
              {currentBookings.length > 0 ? (
                currentBookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    tab={tabId}
                    onCancel={handleCancel}
                    onRebook={handleRebook}
                  />
                ))
              ) : (
                <EmptyState
                  title={
                    tabId === 'active'
                      ? 'No active bookings'
                      : tabId === 'past'
                        ? 'No past bookings'
                        : 'No cancelled bookings'
                  }
                  description={
                    tabId === 'active'
                      ? "You don't have any upcoming appointments. Explore services and book one!"
                      : 'Your booking history will appear here.'
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </Tabs>
    </div>
  );
}
