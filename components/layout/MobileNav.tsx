"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, CalendarDays, Bell, User, DollarSign, List, BarChart3, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "resident" | "vendor" | "manager";

const mobileNav: Record<Role, { icon: React.ElementType; label: string; href: string }[]> = {
  resident: [
    { icon: LayoutDashboard, label: "Home", href: "/resident" },
    { icon: ShoppingBag, label: "Services", href: "/resident/services" },
    { icon: CalendarDays, label: "Bookings", href: "/resident/bookings" },
    { icon: Bell, label: "Alerts", href: "/resident/notifications" },
    { icon: User, label: "Profile", href: "/resident/profile" },
  ],
  vendor: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/vendor" },
    { icon: List, label: "Queue", href: "/vendor/queue" },
    { icon: CalendarDays, label: "Schedule", href: "/vendor/schedule" },
    { icon: DollarSign, label: "Earnings", href: "/vendor/earnings" },
    { icon: User, label: "Profile", href: "/vendor/profile" },
  ],
  manager: [
    { icon: LayoutDashboard, label: "Overview", href: "/manager" },
    { icon: BarChart3, label: "Analytics", href: "/manager/analytics" },
    { icon: Megaphone, label: "Announce", href: "/manager/announcements" },
    { icon: User, label: "Profile", href: "/manager/profile" },
  ],
};

const accentTextClass: Record<Role, string> = {
  resident: "text-teal",
  vendor: "text-gold",
  manager: "text-purple-accent",
};

export default function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const nav = mobileNav[role];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-white/[0.07] flex items-center justify-around px-2 py-2 safe-area-pb">
      {/* Return to home — logo tap */}
      <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all opacity-50 hover:opacity-100" aria-label="Return to home">
        <Image src="/liferise_logo.png" alt="Home" width={22} height={22} className="h-5.5 w-auto object-contain" />
        <span className="text-[10px] font-medium text-muted">Home</span>
      </Link>

      {nav.map(({ icon: Icon, label, href }) => {
        const active = pathname === href || (href !== `/${role}` && pathname.startsWith(href));
        return (
          <Link key={href} href={href}
            className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all", active ? "opacity-100" : "opacity-50")}>
            <Icon size={22} className={active ? accentTextClass[role] : "text-muted"} />
            <span className={cn("text-[10px] font-medium", active ? accentTextClass[role] : "text-muted")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
