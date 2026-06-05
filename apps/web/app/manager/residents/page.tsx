'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, CalendarDays, Phone, Mail, X } from 'lucide-react';
interface Resident {
  id: string;
  name: string;
  unit: string;
  building: string;
  email: string;
  phone: string;
  status: string;
  moveInDate: string;
  avatar?: string;
  lastService?: string;
  totalBookings?: number;
  outstandingBalance?: number;
  lastActivity?: string;
}
const residentDirectory: Resident[] = [];
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { staggerContainerResponsive, fadeUpItem } from '@/lib/animations';
import { cn, getInitials } from '@/lib/utils';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

type ViewMode = 'grid' | 'table';

export default function ResidentsPage() {
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('All');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedResident, setSelectedResident] = useState<string | null>(null);
  const modalRef = useFocusTrap<HTMLDivElement>(!!selectedResident, () =>
    setSelectedResident(null)
  );

  const buildings = ['All', ...Array.from(new Set(residentDirectory.map((r) => r.building)))];

  const filtered = useMemo(() => {
    return residentDirectory.filter((r) => {
      const matchesBuilding = buildingFilter === 'All' || r.building === buildingFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        q === '' ||
        r.name.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q);
      return matchesBuilding && matchesSearch;
    });
  }, [search, buildingFilter]);

  const resident = selectedResident
    ? residentDirectory.find((r) => r.id === selectedResident)
    : null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto pb-24 lg:pb-8">
      <SectionHeader title="Resident Directory" subtitle={`${filtered.length} residents`} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, unit, or email..."
            className="w-full rounded-xl bg-midnight/60 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-lr-white placeholder:text-muted focus:outline-none focus:border-purple-accent/40 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          {buildings.map((b) => (
            <button
              type="button"
              key={b}
              onClick={() => setBuildingFilter(b)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                buildingFilter === b
                  ? 'bg-purple-accent text-white'
                  : 'bg-white/6 text-muted hover:text-lr-white'
              )}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-midnight/60 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'grid' ? 'bg-purple-accent text-white' : 'text-muted hover:text-lr-white'
            )}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'table'
                ? 'bg-purple-accent text-white'
                : 'text-muted hover:text-lr-white'
            )}
          >
            Table
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <motion.div
          variants={staggerContainerResponsive(0.04)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((r) => (
                <motion.div key={r.id} variants={fadeUpItem}>
                  <GlassCard
                    className="p-4 cursor-pointer"
                    onClick={() => setSelectedResident(r.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-accent to-indigo-700 flex items-center justify-center text-xs font-bold text-white font-heading">
                        {getInitials(r.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-lr-white truncate">{r.name}</p>
                          <StatusBadge status={r.status} variant="manager" />
                        </div>
                        <p className="text-muted text-[11px] mt-0.5">
                          Unit {r.unit} · {r.building}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                          <span className="flex items-center gap-1">
                            <CalendarDays size={9} /> {r.totalBookings} bookings
                          </span>
                          {(r.outstandingBalance ?? 0) > 0 && (
                            <span className="text-red-400">${r.outstandingBalance} due</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          ) : (
            <GlassCard className="overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    {['Name', 'Unit', 'Building', 'Email', 'Phone', 'Status', 'Bookings'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-[10px] text-muted uppercase tracking-wider font-medium"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-white/4 hover:bg-white/2 transition-colors cursor-pointer"
                      onClick={() => setSelectedResident(r.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-linear-to-br from-purple-accent to-indigo-700 flex items-center justify-center text-[9px] font-bold text-white font-heading">
                            {getInitials(r.name)}
                          </div>
                          <span className="text-lr-white">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{r.unit}</td>
                      <td className="px-4 py-3 text-muted">{r.building}</td>
                      <td className="px-4 py-3 text-muted">{r.email}</td>
                      <td className="px-4 py-3 text-muted">{r.phone}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} variant="manager" />
                      </td>
                      <td className="px-4 py-3 text-muted">{r.totalBookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          )}
        </motion.div>
      ) : (
        <EmptyState
          icon={<Users className="h-6 w-6 text-muted" />}
          title="No residents found"
          description="Try adjusting your search or building filter."
        />
      )}

      {/* Detail Modal */}
      {resident && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-sm"
          onClick={() => setSelectedResident(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            tabIndex={-1}
            className="glass rounded-2xl p-6 max-w-md w-full border border-white/10 outline-none"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-lr-white">Resident Details</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedResident(null)}
                className="text-muted hover:text-lr-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-linear-to-br from-purple-accent to-indigo-700 flex items-center justify-center text-lg font-bold text-white font-heading">
                {getInitials(resident.name)}
              </div>
              <div>
                <p className="font-semibold text-lr-white">{resident.name}</p>
                <p className="text-muted text-xs">
                  Unit {resident.unit} · {resident.building}
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted">
                <Mail size={13} /> {resident.email}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Phone size={13} /> {resident.phone}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <CalendarDays size={13} /> Last activity: {resident.lastActivity}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-white/[0.07]">
              <p className="text-muted text-xs mb-2">Recent Activity</p>
              <div className="space-y-2">
                {[
                  { action: 'Booked Deep Tissue Massage', date: 'May 20', type: 'booking' },
                  { action: 'Paid $85 via Visa •••• 4242', date: 'May 20', type: 'payment' },
                  { action: 'Updated profile info', date: 'May 15', type: 'system' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-lr-white">{a.action}</span>
                    <span className="text-muted">{a.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
