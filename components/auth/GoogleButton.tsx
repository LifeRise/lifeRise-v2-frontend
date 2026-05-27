"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Globe } from "lucide-react";

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const supabase = createClient();

    // Check if using mock auth (no real credentials)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Mock Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (!error && data?.url) {
        router.push(data.url);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      console.error("Google sign in error:", error);
      setLoading(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-lr-white font-medium text-sm hover:bg-white/10 transition-all disabled:opacity-50"
    >
      {loading ? (
        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : (
        <Globe size={18} className="text-teal" />
      )}
      {label}
    </button>
  );
}
