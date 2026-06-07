'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarDays,
  ShieldCheck,
  Users,
  Briefcase,
  Building2,
  Store,
  MapPin,
  Image as ImageIcon,
  Megaphone,
  PartyPopper,
  MailCheck,
  ListChecks,
  CalendarCheck,
  Ticket,
  RotateCcw,
  MessageSquareQuote,
  Wrench,
  Tags,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  ChevronDown,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/hooks';
import { useAppStore, useUnreadCount } from '@/lib/store';

type Role = 'resident' | 'vendor' | 'manager' | 'admin';

interface LeafItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface GroupItem {
  icon?: React.ElementType;
  label: string;
  children: LeafItem[];
}

type NavItem = LeafItem | GroupItem;

function isGroup(item: NavItem): item is GroupItem {
  return 'children' in item;
}

const residentNav: LeafItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/resident' },
  { icon: Store, label: 'Services', href: '/resident/services' },
  { icon: CalendarDays, label: 'My Bookings', href: '/resident/bookings' },
  { icon: PartyPopper, label: 'Events', href: '/resident/events' },
  { icon: Briefcase, label: 'Favorites', href: '/resident/favorites' },
  { icon: MailCheck, label: 'Notifications', href: '/resident/notifications' },
  { icon: Users, label: 'Profile', href: '/resident/profile' },
];

const vendorNav: LeafItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/vendor' },
  { icon: CalendarDays, label: 'My Schedule', href: '/vendor/schedule' },
  { icon: ListChecks, label: 'Booking Queue', href: '/vendor/queue' },
  { icon: Ticket, label: 'Earnings', href: '/vendor/earnings' },
  { icon: Wrench, label: 'My Services', href: '/vendor/services' },
  { icon: Users, label: 'Profile', href: '/vendor/profile' },
];

// Property manager nav — scoped to a single complex
const managerNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/manager' },
  { icon: CalendarDays, label: 'Calendar', href: '/manager/calendar' },
  { icon: Users, label: 'Residents', href: '/manager/residents' },
  { icon: Briefcase, label: 'Vendors', href: '/manager/vendors' },
  { icon: BarChart3, label: 'Analytics', href: '/manager/analytics' },
  {
    label: 'Community',
    children: [
      { icon: Megaphone, label: 'Announcements', href: '/manager/announcements' },
      { icon: PartyPopper, label: 'Group Events', href: '/manager/events' },
      { icon: MailCheck, label: 'Event Responses', href: '/manager/events/responses' },
      { icon: CalendarCheck, label: 'Event Bookings', href: '/manager/events/bookings' },
      { icon: ListChecks, label: 'Waitlists', href: '/manager/waitlists' },
    ],
  },
  {
    label: 'Operations',
    children: [
      { icon: Ticket, label: 'Bookings', href: '/manager/bookings' },
      { icon: RotateCcw, label: 'Refunded', href: '/manager/bookings/refunded' },
      { icon: MessageSquareQuote, label: 'Feedbacks', href: '/manager/feedbacks' },
    ],
  },
  {
    label: 'Configuration',
    children: [{ icon: Settings, label: 'Settings', href: '/manager/settings' }],
  },
];

// Platform admin nav — full LifeRise platform control
const adminNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: ShieldCheck, label: 'Roles', href: '/admin/roles' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  {
    label: 'Companies',
    children: [
      { icon: Building2, label: 'All Companies', href: '/admin/companies' },
      { icon: Store, label: 'Vendor Companies', href: '/admin/companies/vendor' },
      { icon: Building2, label: 'Affiliate Companies', href: '/admin/companies/affiliate' },
    ],
  },
  { icon: ShieldCheck, label: 'Complex Managers', href: '/admin/complex-managers' },
  { icon: Briefcase, label: 'Service Providers', href: '/admin/service-providers' },
  { icon: Users, label: 'Customers', href: '/admin/customers' },
  {
    label: 'Location Management',
    children: [
      { icon: MapPin, label: 'Regions', href: '/admin/locations/regions' },
      { icon: MapPin, label: 'Cities', href: '/admin/locations/cities' },
      { icon: MapPin, label: 'Neighborhoods', href: '/admin/locations/neighborhoods' },
    ],
  },
  { icon: ImageIcon, label: 'App Banners', href: '/admin/banners' },
  { icon: Megaphone, label: 'Announcements', href: '/admin/announcements' },
  { icon: PartyPopper, label: 'Group Events', href: '/admin/events' },
  { icon: MailCheck, label: 'Event Responses', href: '/admin/events/responses' },
  { icon: ListChecks, label: 'Waitlists', href: '/admin/waitlists' },
  { icon: CalendarCheck, label: 'Event Bookings', href: '/admin/events/bookings' },
  { icon: Ticket, label: 'Bookings', href: '/admin/bookings' },
  { icon: RotateCcw, label: 'Refunded Bookings', href: '/admin/bookings/refunded' },
  { icon: MessageSquareQuote, label: 'Feedbacks', href: '/admin/feedbacks' },
  {
    label: 'Services',
    children: [
      { icon: Wrench, label: 'Services', href: '/admin/services' },
      { icon: Tags, label: 'Categories', href: '/admin/services/categories' },
    ],
  },
  { icon: HelpCircle, label: 'Manage FAQs', href: '/admin/faqs' },
  { icon: Shield, label: 'Vendor Approvals', href: '/admin/approvals' },
  {
    label: 'Platform',
    children: [
      { icon: MessageSquareQuote, label: 'Support Tickets', href: '/admin/support' },
      { icon: Settings, label: 'Settings', href: '/admin/settings' },
    ],
  },
];

const accentColor: Record<Role, string> = {
  resident: '#00D4AA',
  vendor: '#F5A623',
  manager: '#818CF8',
  admin: '#EF4444',
};

const accentBgClass: Record<Role, string> = {
  resident: 'bg-teal',
  vendor: 'bg-gold',
  manager: 'bg-purple-accent',
  admin: 'bg-red-500',
};

const COLLAPSED_KEY = 'liferise_sidebar_collapsed';

function getInitialCollapsed(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function isLeafActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (
    href !== '/manager' &&
    href !== '/resident' &&
    href !== '/vendor' &&
    pathname.startsWith(href)
  ) {
    return true;
  }
  return false;
}

function isGroupActive(pathname: string, children: LeafItem[]): boolean {
  return children.some((c) => isLeafActive(pathname, c.href));
}

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const setRole = useAppStore((s) => s.setRole);
  const unreadCount = useUnreadCount();
  const accent = accentColor[role];

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setRole(null);
    router.push('/login');
  };

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Guest';
  const userEmail = profile?.email ?? '';
  const initials = profile
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
    : '??';
  const complexName =
    role === 'vendor'
      ? 'LifeRise Vendor'
      : role === 'admin'
        ? 'LifeRise Platform'
        : 'Riverside Commons';

  const renderNavItem = (item: NavItem) => {
    if (isGroup(item)) {
      const active = isGroupActive(pathname, item.children);
      const isOpen = !collapsed[item.label];
      return (
        <div key={item.label} className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleGroup(item.label)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              active ? 'text-lr-white' : 'text-muted'
            )}
            style={active ? { background: `${accent}12` } : {}}
          >
            <span className="flex items-center gap-3">
              {active && <div className="w-1 h-1 rounded-full" style={{ background: accent }} />}
              {item.label}
            </span>
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pl-4 space-y-0.5 border-l border-white/[0.07] ml-3">
                  {item.children.map((child) => {
                    const childActive = isLeafActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium',
                          childActive ? 'nav-active' : 'text-muted'
                        )}
                        style={
                          childActive
                            ? { color: accent, borderLeftColor: accent, background: `${accent}18` }
                            : {}
                        }
                      >
                        <child.icon size={16} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    const active = isLeafActive(pathname, item.href);
    const isNotifications =
      item.href === '/resident/notifications' || item.href === '/vendor/notifications';
    const showBadge = isNotifications && unreadCount > 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
          active ? 'nav-active' : 'text-muted'
        )}
        style={active ? { color: accent, borderLeftColor: accent, background: `${accent}18` } : {}}
      >
        <div className="relative">
          <item.icon size={18} />
          {showBadge && (
            <span className="absolute -top-1.5 -right-2 min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-slate-deep border-r border-white/[0.07] z-40">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.07] hover:bg-white/5 transition-colors"
      >
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
        {role === 'admin' ? (
          <>{adminNav.map(renderNavItem)}</>
        ) : role === 'manager' ? (
          <>
            {managerNav.map(renderNavItem)}
            <div className="pt-4 mt-2 border-t border-white/[0.07]">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
                Account
              </p>
              <Link
                href="/manager/support"
                className={cn(
                  'nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                  pathname === '/manager/support' ? 'nav-active' : 'text-muted'
                )}
                style={
                  pathname === '/manager/support'
                    ? { color: accent, borderLeftColor: accent, background: `${accent}18` }
                    : {}
                }
              >
                <HelpCircle size={18} />
                Support
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-lr-white hover:bg-white/5 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </>
        ) : (
          (role === 'resident' ? residentNav : vendorNav).map((item) => {
            const active = isLeafActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                  active ? 'nav-active' : 'text-muted'
                )}
                style={
                  active
                    ? { color: accent, borderLeftColor: accent, background: `${accent}18` }
                    : {}
                }
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })
        )}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3 px-4 py-4 border-t border-white/[0.07]">
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-midnight shrink-0',
            accentBgClass[role]
          )}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lr-white text-sm font-semibold truncate">{userName}</p>
          <p className="text-muted text-xs truncate">{userEmail}</p>
        </div>
        {role !== 'manager' && (
          <button
            type="button"
            onClick={handleSignOut}
            className="text-muted hover:text-lr-white transition-colors"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
