"use client";

import { User } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/auth/hooks";

export default function VendorProfilePage() {
  const { profile } = useAuth();

  return (
    <div className="px-4 sm:px-6 py-6">
      <h1 className="font-heading font-bold text-lr-white text-xl mb-6 flex items-center gap-2">
        <User size={20} className="text-gold" /> Profile
      </h1>
      <GlassCard className="p-6 space-y-4">
        {profile ? (
          <>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center text-midnight text-xl font-bold">
                {`${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()}
              </div>
              <div>
                <p className="text-lr-white font-semibold text-lg">{profile.first_name} {profile.last_name}</p>
                <p className="text-muted text-sm">{profile.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <p className="text-muted text-xs">Phone</p>
                <p className="text-lr-white text-sm">{profile.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Role</p>
                <p className="text-lr-white text-sm capitalize">{profile.role}</p>
              </div>
              <div>
                <p className="text-muted text-xs">EIN / Tax ID</p>
                <p className="text-lr-white text-sm">{profile.ein_tax_id || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Status</p>
                <p className="text-lr-white text-sm capitalize">{profile.approval_status || profile.status}</p>
              </div>
            </div>
            {profile.description && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-muted text-xs mb-1">Description</p>
                <p className="text-lr-white text-sm">{profile.description}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted text-sm text-center">Loading profile...</p>
        )}
      </GlassCard>
    </div>
  );
}
