"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, CalendarDays, Star, Heart,
  Bell, User, Briefcase, List, DollarSign, BarChart3,
  Users, Megaphone, Settings, LogOut, ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    { icon: Megaphone, label: "Announcements", href: "/manager/announcements" },
    { icon: Settings, label: "Settings", href: "/manager/settings" },
  ],
};

const userConfig: Record<Role, { name: string; email: string; initials: string; complexName: string }> = {
  resident: { name: "Sarah Mitchell", email: "sarah.m@riverside.com", initials: "SM", complexName: "Riverside Commons" },
  vendor: { name: "Marcus Johnson", email: "marcus.j@liferise.com", initials: "MJ", complexName: "LifeRise Vendor" },
  manager: { name: "Jennifer Torres", email: "j.torres@propmgmt.com", initials: "JT", complexName: "Riverside Commons" },
};

const accentColor: Record<Role, string> = {
  resident: "#00D4AA",
  vendor: "#F5A623",
  manager: "#818CF8",
};

const portalLinks = [
  { role: "resident" as Role, label: "Resident", href: "/resident" },
  { role: "vendor" as Role, label: "Vendor", href: "/vendor" },
  { role: "manager" as Role, label: "Manager", href: "/manager" },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = navConfig[role];
  const user = userConfig[role];
  const accent = accentColor[role];

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-slate-deep border-r border-white/[0.07] z-40">
      {/* Logo — click to return to landing page */}
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
          <p className="text-muted text-xs">{user.complexName}</p>
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

      {/* Portal switcher */}
      <div className="px-3 py-3 border-t border-white/[0.07]">
        <p className="text-muted text-[10px] uppercase tracking-widest px-3 mb-2 flex items-center gap-1.5">
          <ArrowLeftRight size={10} /> Demo Portals
        </p>
        <div className="flex gap-1.5">
          {portalLinks.map((p) => (
            <button type="button" key={p.role} onClick={() => router.push(p.href)}
              className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                role === p.role ? "text-midnight" : "text-muted hover:text-lr-white hover:bg-white/5")}
              style={role === p.role ? { background: accentColor[p.role] } : {}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* User */}
      <div className="flex items-center gap-3 px-4 py-4 border-t border-white/[0.07]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-midnight shrink-0" style={{ background: accent }}>
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lr-white text-sm font-semibold truncate">{user.name}</p>
          <p className="text-muted text-xs truncate">{user.email}</p>
        </div>
        <button type="button" onClick={() => router.push("/")} className="text-muted hover:text-lr-white transition-colors" aria-label="Log out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
