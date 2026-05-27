"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Clock,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useAuth, useAllProfiles } from "@/lib/auth/hooks";
import { GlassCard } from "@/components/ui/GlassCard";

export default function AdminApprovalsPage() {
  const router = useRouter();
  const { profile, isLoading: authLoading } = useAuth();
  const { profiles, isLoading, approveVendor, rejectVendor } = useAllProfiles();

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "manager")) {
      router.push("/resident");
    }
  }, [profile, authLoading, router]);

  const pendingVendors = profiles.filter(
    (p) => p.role === "vendor" && p.approval_status === "pending"
  );

  const approvedVendors = profiles.filter(
    (p) => p.role === "vendor" && p.approval_status === "approved"
  );

  const rejectedVendors = profiles.filter(
    (p) => p.role === "vendor" && p.approval_status === "rejected"
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal/30 border-t-teal animate-spin" />
      </div>
    );
  }

  if (!profile || profile.role !== "manager") return null;

  return (
    <div className="min-h-screen bg-midnight">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/manager"
            className="flex items-center gap-2 text-muted hover:text-lr-white transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-purple-accent/15 flex items-center justify-center">
            <ShieldCheck size={20} className="text-purple-accent" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lr-white text-2xl">
              Vendor Approvals
            </h1>
            <p className="text-muted text-sm">
              Review and manage vendor applications
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <GlassCard className="p-4 text-center">
            <p className="text-gold text-2xl font-bold">{pendingVendors.length}</p>
            <p className="text-muted text-xs mt-1">Pending</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-teal text-2xl font-bold">{approvedVendors.length}</p>
            <p className="text-muted text-xs mt-1">Approved</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-rose text-2xl font-bold">{rejectedVendors.length}</p>
            <p className="text-muted text-xs mt-1">Rejected</p>
          </GlassCard>
        </div>

        {/* Pending Applications */}
        <div className="mb-8">
          <h2 className="font-heading font-semibold text-lr-white text-lg mb-4 flex items-center gap-2">
            <Clock size={16} className="text-gold" />
            Pending Applications
          </h2>

          {pendingVendors.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-muted text-sm">No pending applications</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {pendingVendors.map((vendor) => (
                <motion.div
                  key={vendor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-5 border border-white/5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                          <User size={18} className="text-gold" />
                        </div>
                        <div>
                          <p className="text-lr-white font-semibold text-sm">
                            {vendor.first_name} {vendor.last_name}
                          </p>
                          <p className="text-muted text-xs">{vendor.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Phone size={12} className="text-teal" />
                          {vendor.phone || "N/A"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <CreditCard size={12} className="text-gold" />
                          {vendor.ein_tax_id || "N/A"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Mail size={12} className="text-purple-accent" />
                          {new Date(vendor.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {vendor.description && (
                        <div className="flex items-start gap-2 pt-1">
                          <FileText size={12} className="text-muted mt-0.5 shrink-0" />
                          <p className="text-muted text-xs leading-relaxed">
                            {vendor.description}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <button
                        onClick={() => approveVendor(vendor.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal/10 text-teal text-xs font-semibold hover:bg-teal/20 transition-colors"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button
                        onClick={() => rejectVendor(vendor.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose/10 text-rose text-xs font-semibold hover:bg-rose/20 transition-colors"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Approved Vendors */}
        {approvedVendors.length > 0 && (
          <div className="mb-8">
            <h2 className="font-heading font-semibold text-lr-white text-lg mb-4 flex items-center gap-2">
              <CheckCircle size={16} className="text-teal" />
              Approved Vendors
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {approvedVendors.map((vendor) => (
                <GlassCard key={vendor.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal/10 flex items-center justify-center">
                      <User size={16} className="text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lr-white font-medium text-sm truncate">
                        {vendor.first_name} {vendor.last_name}
                      </p>
                      <p className="text-muted text-xs truncate">{vendor.email}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-teal/10 text-teal shrink-0">
                      Approved
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Vendors */}
        {rejectedVendors.length > 0 && (
          <div>
            <h2 className="font-heading font-semibold text-lr-white text-lg mb-4 flex items-center gap-2">
              <XCircle size={16} className="text-rose" />
              Rejected Vendors
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {rejectedVendors.map((vendor) => (
                <GlassCard key={vendor.id} className="p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose/10 flex items-center justify-center">
                      <User size={16} className="text-rose" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lr-white font-medium text-sm truncate">
                        {vendor.first_name} {vendor.last_name}
                      </p>
                      <p className="text-muted text-xs truncate">{vendor.email}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-rose/10 text-rose shrink-0">
                      Rejected
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
