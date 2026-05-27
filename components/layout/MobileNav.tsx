"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  CalendarDays,
  Bell,
  User,
  DollarSign,
  List,
  BarChart3,
  Megaphone,
  Users,
  ArrowLeftRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/hooks";
import { useAppStore } from "@/lib/store";

type Role = "resident" | "vendor" | "manager";

const mobileNav: Record<
  Role,
  { icon: React.ElementType; label: string; href: string; badge?: number; isDrawer?: boolean }[]
> = {
  resident: [
    { icon: ShoppingBag, label: "Services", href: "/resident/services" },
    { icon: CalendarDays, label: "Bookings", href: "/resident/bookings" },
    { icon: LayoutDashboard, label: "Home", href: "/resident" },
    { icon: User, label: "Account", href: "#", isDrawer: true },
  ],
  vendor: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/vendor" },
    { icon: List, label: "Queue", href: "/vendor/queue" },
    { icon: CalendarDays, label: "Schedule", href: "/vendor/schedule" },
    { icon: DollarSign, label: "Earnings", href: "/vendor/earnings" },
  ],
  manager: [
    { icon: LayoutDashboard, label: "Overview", href: "/manager" },
    { icon: BarChart3, label: "Analytics", href: "/manager/analytics" },
    { icon: Users, label: "Directory", href: "/manager/residents" },
    { icon: ShieldCheck, label: "Approvals", href: "/admin/approvals" },
    { icon: User, label: "Profile", href: "/manager/profile" },
  ],
};

const accentTextClass: Record<Role, string> = {
  resident: "text-teal",
  vendor: "text-gold",
  manager: "text-purple-accent",
};

const accentColor: Record<Role, string> = {
  resident: "#00D4AA",
  vendor: "#F5A623",
  manager: "#818CF8",
};

export default function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = mobileNav[role];
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const { profile, signOut } = useAuth();
  const setRole = useAppStore((s) => s.setRole);

  const handleSignOut = async () => {
    await signOut();
    setRole(null);
    router.push("/login");
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-white/[0.07] flex items-center justify-around px-2 py-2 safe-area-pb">
        {nav.map(({ icon: Icon, label, href, badge, isDrawer }) => {
          const active =
            !isDrawer &&
            (pathname === href || (href !== `/${role}` && pathname.startsWith(href)));
          const content = (
            <>
              <div className="relative">
                <Icon
                  size={22}
                  className={active ? accentTextClass[role] : "text-muted"}
                />
                {badge && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? accentTextClass[role] : "text-muted"
                )}
              >
                {label}
              </span>
            </>
          );

          if (isDrawer) {
            return (
              <button
                type="button"
                key={label}
                onClick={() => setShowAccountDrawer(true)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all opacity-50 hover:opacity-100"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all relative",
                active ? "opacity-100" : "opacity-50"
              )}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Account Drawer for Resident */}
      <AnimatePresence>
        {showAccountDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-midnight/60 backdrop-blur-sm"
              onClick={() => setShowAccountDrawer(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 glass-dark rounded-t-3xl border-t border-white/8 shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: accentColor[role] }}
                />
              </div>
              <div className="p-5 space-y-1">
                {/* User info */}
                {profile && (
                  <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-midnight text-sm font-bold">
                      {`${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lr-white text-sm font-semibold">{profile.first_name} {profile.last_name}</p>
                      <p className="text-muted text-xs">{profile.email}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-wider text-muted px-3 mb-2">
                  Account
                </p>
                {[
                  { label: "Notifications", href: "/resident/notifications", icon: Bell, badge: 3 },
                  { label: "Profile", href: "/resident/profile", icon: User },
                  { label: "Events", href: "/resident/events", icon: CalendarDays },
                  { label: "Favorites", href: "/resident/favorites", icon: ShoppingBag },
                ].map(({ label, href, icon: Icon, badge }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowAccountDrawer(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted hover:text-lr-white hover:bg-white/5 transition-colors relative"
                  >
                    <Icon size={18} />
                    {label}
                    {badge && badge > 0 && (
                      <span className="ml-auto min-w-4.5 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                        {badge}
                      </span>
                    )}
                  </Link>
                ))}
                <div className="border-t border-white/[0.07] my-2" />
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountDrawer(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted hover:text-lr-white hover:bg-white/5 transition-colors w-full"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
              <div className="safe-area-pb" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
