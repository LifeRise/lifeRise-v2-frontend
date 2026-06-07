'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShoppingBag, Tag, AlertTriangle, CheckCheck, Info, Loader2 } from 'lucide-react';
import { useNotifications } from '@/lib/api/hooks';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { staggerContainerResponsive, listItem } from '@/lib/animations';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  booking: { icon: ShoppingBag, color: 'text-teal', bg: 'bg-teal/10' },
  push: { icon: ShoppingBag, color: 'text-teal', bg: 'bg-teal/10' },
  promo: { icon: Tag, color: 'text-gold', bg: 'bg-gold/10' },
  alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
  system: { icon: Info, color: 'text-purple-accent', bg: 'bg-purple-accent/10' },
  email: { icon: Info, color: 'text-purple-accent', bg: 'bg-purple-accent/10' },
  reminder: { icon: Info, color: 'text-purple-accent', bg: 'bg-purple-accent/10' },
};

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const { notifications, isLoading, error, refresh, markRead, markAllRead } = useNotifications();

  // Note: bulk deletion is not supported by the backend API; only mark-all-read is available.

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-teal animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto pb-24 lg:pb-8">
        <EmptyState
          icon={<Bell className="h-6 w-6 text-muted" />}
          title="Something went wrong"
          description={error}
        />
        <button
          onClick={refresh}
          className="mt-4 mx-auto block px-4 py-2 rounded-lg bg-teal/10 text-teal text-sm font-medium hover:bg-teal/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-lr-white">Notifications</h1>
          {unreadCount > 0 && <p className="text-muted text-xs mt-0.5">{unreadCount} unread</p>}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] text-muted hover:text-lr-white hover:bg-white/[0.10] transition-colors flex items-center gap-1"
            >
              <CheckCheck size={12} /> Mark all read
            </button>
          )}
          {/* Bulk deletion is not supported by the backend API */}
        </div>
      </div>

      {notifications.length > 0 ? (
        <motion.div
          variants={staggerContainerResponsive(0.03)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="space-y-2"
        >
          <AnimatePresence>
            {notifications.map((n) => {
              const config = typeConfig[n.type] || typeConfig.system;
              const Icon = config.icon;
              const isUnread = n.read_at === null;
              return (
                <motion.div key={n.id} variants={listItem} layout exit={{ opacity: 0, x: 40 }}>
                  <GlassCard
                    className={cn(
                      'p-3.5 transition-opacity cursor-pointer',
                      isUnread && 'border-l-2 border-l-teal'
                    )}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                          config.bg
                        )}
                      >
                        <Icon size={15} className={config.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-lr-white font-medium">{n.title}</p>
                          <span className="text-[10px] text-muted shrink-0">
                            {relativeTime(n.created_at)}
                          </span>
                        </div>
                        <p className="text-muted text-xs mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      {isUnread && <div className="w-2 h-2 rounded-full bg-teal shrink-0 mt-1.5" />}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState
          icon={<Bell className="h-6 w-6 text-muted" />}
          title="All caught up"
          description="You have no notifications right now."
        />
      )}
    </div>
  );
}
