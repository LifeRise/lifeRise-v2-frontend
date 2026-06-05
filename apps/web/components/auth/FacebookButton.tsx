"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FacebookButton({ label = "Continue with Facebook" }: { label?: string }) {
  const [loading, setLoading] = useState(false);

  const handleFacebookSignIn = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "email public_profile",
      },
    });

    if (error) {
      console.error("Facebook sign in error:", error);
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
      onClick={handleFacebookSignIn}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-[#1877F2]/15 text-lr-white font-medium text-sm hover:bg-[#1877F2]/25 transition-all disabled:opacity-50"
    >
      {loading ? (
        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )}
      {label}
    </button>
  );
}
