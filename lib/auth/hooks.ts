"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getMockProfile,
  updateMockProfile,
  getAllMockProfiles,
  type MockProfile,
} from "@/lib/auth/mock-auth";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "resident" | "vendor" | "manager";
  approval_status: "pending" | "approved" | "rejected";
  onboarding_completed: boolean;
  ein_tax_id?: string;
  description?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

function mapMockProfile(mock: MockProfile): Profile {
  return {
    id: mock.id,
    email: mock.email,
    first_name: mock.first_name,
    last_name: mock.last_name,
    phone: mock.phone,
    role: mock.role,
    approval_status: mock.approval_status,
    onboarding_completed: mock.onboarding_completed,
    ein_tax_id: mock.ein_tax_id,
    description: mock.description,
    avatar_url: mock.avatar_url,
    created_at: mock.created_at,
    updated_at: mock.updated_at,
  };
}

export function useAuth() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(
    async (userId: string) => {
      const mock = getMockProfile(userId);
      if (mock) {
        setProfile(mapMockProfile(mock));
        return;
      }

      // Real Supabase path
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (data) setProfile(data as Profile);
      }
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await refreshProfile(session.user.id);
      }
      setIsLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await refreshProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, refreshProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return { user, profile, isLoading, signOut, refreshProfile };
}

export function useAllProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock path
    const mockProfiles = getAllMockProfiles().map(mapMockProfile);
    setProfiles(mockProfiles);
    setIsLoading(false);
  }, []);

  const approveVendor = (userId: string) => {
    const updated = updateMockProfile(userId, { approval_status: "approved" });
    if (updated) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? mapMockProfile(updated) : p))
      );
    }
  };

  const rejectVendor = (userId: string) => {
    const updated = updateMockProfile(userId, { approval_status: "rejected" });
    if (updated) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? mapMockProfile(updated) : p))
      );
    }
  };

  return { profiles, isLoading, approveVendor, rejectVendor };
}
