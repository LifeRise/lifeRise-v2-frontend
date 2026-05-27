"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, CalendarDays, Star, Heart,
  Bell, User, Briefcase, List, DollarSign, BarChart3,
  Users, Megaphone, Settings, LogOut, ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/hooks";
import { useAppStore } from "@/lib/store";

type Role = "resident" | "vendor" | "manager";

const navConfig: Record<Role, { icon: React.ElementType; label: string; href: string }[]> = {
  resident: [
    { icon: LayoutDashboard, label: "Home", href: "/resident" },
    { icon: ShoppingBag, label: "Services", href: "/resident/services" },
    { icon: CalendarDays, label: "My Bookings", href: "/resident/bookings" },
    { icon: Star, label: "Events", href: "/resident/events" },
    { icon: Heart, label: "Favorites", href: "/resident/favorites" },
    { icon: Bell, label: "Notifications", href: "/resident/notifications" },
    { icon: User, label: "Profile", href: "/resident/profile" },
  ],
  vendor: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/vendor" },
    { icon: CalendarDays, label: "My Schedule", href: "/vendor/schedule" },
    { icon: List, label: "Booking Queue", href: "/vendor/queue" },
    { icon: DollarSign, label: "Earnings", href: "/vendor/earnings" },
    { icon: Briefcase, label: "My Services", href: "/vendor/services" },
    { icon: User, label: "Profile", href: "/vendor/profile" },
  ],
  manager: [
    { icon: LayoutDashboard, label: "Overview", href: "/manager" },
    { icon: BarChart3, label: "Analytics", href: "/manager/analytics" },
    { icon: Users, label: "Residents", href: "/manager/residents" },
    { icon: Briefcase, label: "Vendors", href: "/manager/vendors" },
    { icon: ShieldCheck, label: "Approvals", href: "/admin/approvals" },
    { icon: Megaphone, label: "Announcements", href: "/manager/announcements" },
    { icon: Settings, label: "Settings", href: "/manager/settings" },
  ],
};

const accentColor: Record<Role, string> = {
  resident: "#00D4AA",
  vendor: "#F5A623",
  manager: "#818CF8",
};

const accentBgClass: Record<Role, string> = {
  resident: "bg-teal",
  vendor: "bg-gold",
  manager: "bg-purple-accent",
};

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = navConfig[role];
  const accent = accentColor[role];
  const { profile, signOut } = useAuth();
  const setRole = useAppStore((s) => s.setRole);

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : "Guest";
  const userEmail = profile?.email ?? "";
  const initials = profile
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
    : "??";
  const complexName = role === "vendor" ? "LifeRise Vendor" : "Riverside Commons";

  const handleSignOut = async () => {
    await signOut();
    setRole(null);
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-slate-deep border-r border-white/[0.07] z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.07] hover:bg-white/5 transition-colors">
        <Image
          src="/liferise_logo.png"
          alt="LifeRise"
          width={36}
          height={36}
          className="h-9 w-auto object-contain"
          priority
        />
        <div>
          <p className="font-heading font-bold text-lr-white text-sm leading-tight">LifeRise</p>
          <p className="text-muted text-xs">{complexName}</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ icon: Icon, label, href }) => {
          const active = pathname === href || (href !== `/${role}` && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={cn("nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", active ? "nav-active" : "text-muted")}
              style={active ? { color: accent, borderLeftColor: accent, background: `${accent}18` } : {}}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3 px-4 py-4 border-t border-white/[0.07]">
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-midnight shrink-0", accentBgClass[role])}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lr-white text-sm font-semibold truncate">{userName}</p>
          <p className="text-muted text-xs truncate">{userEmail}</p>
        </div>
        <button type="button" onClick={handleSignOut} className="text-muted hover:text-lr-white transition-colors" aria-label="Log out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
