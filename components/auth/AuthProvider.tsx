"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/hooks";
import { useAppStore } from "@/lib/store";

const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/trust-safety", "/offline"];
const authPrefixRoutes = ["/signup/", "/auth/"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAppStore((s) => s.setUser);
  const setProfile = useAppStore((s) => s.setProfile);
  const setAuthLoading = useAppStore((s) => s.setAuthLoading);
  const setRole = useAppStore((s) => s.setRole);

  useEffect(() => {
    setUser(user);
    setProfile(profile);
    setAuthLoading(isLoading);
    if (profile?.role) setRole(profile.role);
  }, [user, profile, isLoading, setUser, setProfile, setAuthLoading, setRole]);

  useEffect(() => {
    if (isLoading) return;

    const isPublic =
      publicRoutes.includes(pathname) ||
      authPrefixRoutes.some((prefix) => pathname.startsWith(prefix));

    if (!user && !isPublic) {
      router.push("/login");
      return;
    }

    if (user && profile) {
      // Vendor pending approval
      if (profile.role === "vendor" && profile.approval_status === "pending" && pathname !== "/pending-approval") {
        router.push("/pending-approval");
        return;
      }

      // Redirect from auth pages to dashboard
      if (pathname === "/login" || pathname === "/signup" || pathname.startsWith("/signup/")) {
        const dest = profile.role === "manager" ? "/manager" : profile.role === "vendor" ? "/vendor" : "/resident";
        router.push(dest);
        return;
      }

      // Role-based route guards
      if (pathname.startsWith("/manager") && profile.role !== "manager") {
        router.push("/resident");
        return;
      }
      if (pathname.startsWith("/vendor") && profile.role !== "vendor") {
        router.push("/resident");
        return;
      }
      if (pathname.startsWith("/admin") && profile.role !== "manager") {
        router.push("/resident");
        return;
      }
    }
  }, [user, profile, isLoading, pathname, router]);

  return <>{children}</>;
}
