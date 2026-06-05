'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, Star, Clock, DollarSign, Pencil, Trash2, X, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/auth/hooks';
import { useServices } from '@/lib/api/hooks';
import { createService, updateService, deleteService } from '@/lib/api/services';
import type { Service } from '@/lib/api/services';
import { cn } from '@/lib/utils';

interface ServiceForm {
  name: string;
  description: string;
  price: string;
  duration: string;
}

function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (id: number) => void;
}) {
  const price = parseFloat(service.price ?? '0').toFixed(0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <GlassCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lr-white text-sm font-semibold truncate">{service.name}</h3>
              <span
                className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                  service.status === 'active' ? 'bg-teal/10 text-teal' : 'bg-muted/10 text-muted'
                )}
              >
                {service.status ?? 'active'}
              </span>
            </div>
            <p className="text-muted text-xs mt-0.5 line-clamp-2">
              {service.description || 'No description'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
              <span className="flex items-center gap-0.5">
                <DollarSign size={8} className="text-gold" /> ${price}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock size={8} /> {service.duration} min
              </span>
              <span className="flex items-center gap-0.5">
                <Star size={8} className="text-gold" /> {service.avg_rating ?? '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title="Edit service"
              onClick={() => onEdit(service)}
              className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-muted hover:text-lr-white hover:bg-white/10 transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              title="Delete service"
              onClick={() => onDelete(service.id)}
              className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-muted hover:text-rose hover:bg-rose/10 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function VendorServicesPage() {
  const { profile } = useAuth();
  const { services: apiServices, isLoading, refresh } = useServices();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>({
    name: '',
    description: '',
    price: '',
    duration: '60',
  });
  const [submitting, setSubmitting] = useState(false);

  const isLive = apiServices.length > 0;

  const handleSave = async () => {
    if (!profile?.role || submitting) return;
    if (!form.name || !form.price || !form.duration) return;

    setSubmitting(true);
    try {
      const priceNum = parseFloat(form.price);
      if (isNaN(priceNum) || priceNum < 0) {
        console.error('Invalid price');
        setSubmitting(false);
        return;
      }

      const data = {
        name: form.name,
        description: form.description || undefined,
        price: priceNum,
        duration: parseInt(form.duration) || 60,
        currency: 'USD',
        location_type: 'on_site',
      };

      if (editingId) {
        await updateService(profile.role, editingId, data);
      } else {
        await createService(profile.role, data);
      }

      setForm({ name: '', description: '', price: '', duration: '60' });
      setEditingId(null);
      setShowForm(false);
      refresh();
    } catch (err: unknown) {
      console.error('Save service failed:', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({
      name: s.name ?? '',
      description: s.description ?? '',
      price: String(s.price ?? ''),
      duration: String(s.duration ?? '60'),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!profile?.role || !confirm('Delete this service?')) return;
    try {
      await deleteService(profile.role, id);
      refresh();
    } catch (err: unknown) {
      console.error('Delete failed:', err instanceof Error ? err.message : String(err));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', description: '', price: '', duration: '60' });
  };

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-lr-white text-xl flex items-center gap-2">
          <Briefcase size={20} className="text-gold" /> My Services
        </h1>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold text-midnight hover:opacity-90 transition-opacity"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-lr-white">
                  {editingId ? 'Edit Service' : 'New Service'}
                </p>
                <button
                  type="button"
                  title="Cancel"
                  onClick={handleCancel}
                  className="text-muted hover:text-lr-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  placeholder="Service name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-midnight/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white placeholder:text-muted focus:outline-none focus:border-gold/40"
                />
                <input
                  placeholder="Price (e.g. 120.00)"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="bg-midnight/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white placeholder:text-muted focus:outline-none focus:border-gold/40"
                />
                <input
                  placeholder="Duration in minutes"
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  className="bg-midnight/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white placeholder:text-muted focus:outline-none focus:border-gold/40"
                />
                <input
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="bg-midnight/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-lr-white placeholder:text-muted focus:outline-none focus:border-gold/40"
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting || !form.name || !form.price}
                className="w-full py-2 rounded-lg text-xs font-semibold bg-gold text-midnight disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {submitting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-midnight/30 border-t-midnight animate-spin" />
                ) : (
                  <>
                    <Check size={12} /> {editingId ? 'Update' : 'Create'} Service
                  </>
                )}
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services List */}
      {apiServices.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6 text-muted" />}
          title="No services yet"
          description="Add your first service to start receiving bookings."
          action={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-gold text-midnight inline-flex items-center gap-1"
            >
              <Plus size={12} /> Add Service
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {apiServices.map((s) => (
              <ServiceCard key={s.id} service={s} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
