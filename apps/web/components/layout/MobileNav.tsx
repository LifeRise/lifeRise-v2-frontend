'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  CalendarDays,
  User,
  DollarSign,
  List,
  BarChart3,
  Users,
  Briefcase,
  LogOut,
  ShieldCheck,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/hooks';
import { useAppStore, useUnreadCount } from '@/lib/store';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { useNotifications } from '@/lib/api/hooks';

type Role = 'resident' | 'vendor' | 'manager' | 'admin';

interface LeafItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface GroupItem {
  label: string;
  children: LeafItem[];
}

type NavItem = LeafItem | GroupItem;

function isGroup(item: NavItem): item is GroupItem {
  return 'children' in item && Array.isArray(item.children);
}

/** Defensive map that logs instead of crashing when the value is not an array. */
function safeMap<T, R>(
  arr: T[] | undefined | null,
  fn: (item: T, index: number) => R,
  label: string
): R[] {
  if (!Array.isArray(arr)) {
    console.error(`[MobileNav] expected array for "${label}" but got:`, arr);
    return [];
  }
  return arr.map(fn);
}

const mobileNav: Record<
  Role,
  { icon: React.ElementType; label: string; href: string; badge?: number; isDrawer?: boolean }[]
> = {
  resident: [
    { icon: ShoppingBag, label: 'Services', href: '/resident/services' },
    { icon: CalendarDays, label: 'Bookings', href: '/resident/bookings' },
    { icon: LayoutDashboard, label: 'Home', href: '/resident' },
    { icon: User, label: 'Account', href: '#', isDrawer: true, badge: 0 },
  ],
  vendor: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/vendor' },
    { icon: List, label: 'Queue', href: '/vendor/queue' },
    { icon: CalendarDays, label: 'Schedule', href: '/vendor/schedule' },
    { icon: DollarSign, label: 'Earnings', href: '/vendor/earnings' },
  ],
  manager: [
    { icon: LayoutDashboard, label: 'Overview', href: '/manager' },
    { icon: BarChart3, label: 'Analytics', href: '/manager/analytics' },
    { icon: Users, label: 'Residents', href: '/manager/residents' },
    { icon: Briefcase, label: 'Vendors', href: '/manager/vendors' },
    { icon: MoreHorizontal, label: 'More', href: '#', isDrawer: true },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
    { icon: Users, label: 'Users', href: '/admin/users' },
    { icon: ShieldCheck, label: 'Approvals', href: '/admin/approvals' },
    { icon: MoreHorizontal, label: 'More', href: '#', isDrawer: true },
  ],
};

// Property manager full drawer nav
const managerFullNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/manager' },
  { icon: CalendarDays, label: 'Calendar', href: '/manager/calendar' },
  { icon: Users, label: 'Residents', href: '/manager/residents' },
  { icon: Briefcase, label: 'Vendors', href: '/manager/vendors' },
  { icon: BarChart3, label: 'Analytics', href: '/manager/analytics' },
  {
    label: 'Community',
    children: [
      { icon: LayoutDashboard, label: 'Announcements', href: '/manager/announcements' },
      { icon: LayoutDashboard, label: 'Group Events', href: '/manager/events' },
      { icon: LayoutDashboard, label: 'Event Responses', href: '/manager/events/responses' },
      { icon: LayoutDashboard, label: 'Event Bookings', href: '/manager/events/bookings' },
      { icon: LayoutDashboard, label: 'Waitlists', href: '/manager/waitlists' },
    ],
  },
  {
    label: 'Operations',
    children: [
      { icon: LayoutDashboard, label: 'Bookings', href: '/manager/bookings' },
      { icon: LayoutDashboard, label: 'Refunded', href: '/manager/bookings/refunded' },
      { icon: LayoutDashboard, label: 'Feedbacks', href: '/manager/feedbacks' },
    ],
  },
  { icon: LayoutDashboard, label: 'Settings', href: '/manager/settings' },
];

// Platform admin full drawer nav
const adminFullNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: ShieldCheck, label: 'Roles', href: '/admin/roles' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  {
    label: 'Companies',
    children: [
      { icon: LayoutDashboard, label: 'All Companies', href: '/admin/companies' },
      { icon: LayoutDashboard, label: 'Vendor Companies', href: '/admin/companies/vendor' },
      { icon: LayoutDashboard, label: 'Affiliate Companies', href: '/admin/companies/affiliate' },
    ],
  },
  { icon: LayoutDashboard, label: 'Complex Managers', href: '/admin/complex-managers' },
  { icon: Users, label: 'Service Providers', href: '/admin/service-providers' },
  { icon: Users, label: 'Customers', href: '/admin/customers' },
  {
    label: 'Locations',
    children: [
      { icon: LayoutDashboard, label: 'Regions', href: '/admin/locations/regions' },
      { icon: LayoutDashboard, label: 'Cities', href: '/admin/locations/cities' },
      { icon: LayoutDashboard, label: 'Neighborhoods', href: '/admin/locations/neighborhoods' },
    ],
  },
  { icon: LayoutDashboard, label: 'App Banners', href: '/admin/banners' },
  { icon: LayoutDashboard, label: 'Announcements', href: '/admin/announcements' },
  { icon: LayoutDashboard, label: 'Group Events', href: '/admin/events' },
  { icon: LayoutDashboard, label: 'Event Responses', href: '/admin/events/responses' },
  { icon: LayoutDashboard, label: 'Event Bookings', href: '/admin/events/bookings' },
  { icon: LayoutDashboard, label: 'Waitlists', href: '/admin/waitlists' },
  { icon: LayoutDashboard, label: 'Bookings', href: '/admin/bookings' },
  { icon: LayoutDashboard, label: 'Refunded Bookings', href: '/admin/bookings/refunded' },
  { icon: LayoutDashboard, label: 'Feedbacks', href: '/admin/feedbacks' },
  {
    label: 'Services',
    children: [
      { icon: LayoutDashboard, label: 'Services', href: '/admin/services' },
      { icon: LayoutDashboard, label: 'Categories', href: '/admin/services/categories' },
    ],
  },
  { icon: LayoutDashboard, label: 'Manage FAQs', href: '/admin/faqs' },
  { icon: ShieldCheck, label: 'Vendor Approvals', href: '/admin/approvals' },
  { icon: LayoutDashboard, label: 'Support', href: '/admin/support' },
  { icon: LayoutDashboard, label: 'Settings', href: '/admin/settings' },
];

const accentTextClass: Record<Role, string> = {
  resident: 'text-teal',
  vendor: 'text-gold',
  manager: 'text-purple-accent',
  admin: 'text-red-500',
};

const accentColor: Record<Role, string> = {
  resident: '#00D4AA',
  vendor: '#F5A623',
  manager: '#818CF8',
  admin: '#EF4444',
};

function isLeafActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (
    href !== '/manager' &&
    href !== '/resident' &&
    href !== '/vendor' &&
    href !== '/admin' &&
    pathname.startsWith(href)
  ) {
    return true;
  }
  return false;
}

export default function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const navRaw = mobileNav[role];
  const nav = Array.isArray(navRaw) ? navRaw : [];
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const { profile, signOut } = useAuth();
  const setRole = useAppStore((s) => s.setRole);
  const unreadCount = useUnreadCount();
  const { refreshUnreadCount } = useNotifications();

  useEffect(() => {
    refreshUnreadCount();
    // Refresh unread count every 60 seconds
    const interval = setInterval(refreshUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  const handleSignOut = async () => {
    await signOut();
    setRole(null);
    router.push('/login');
  };

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-white/[0.07] flex items-center justify-around px-2 py-2 safe-area-pb">
        {safeMap(
          nav,
          ({ icon: Icon, label, href, badge, isDrawer }) => {
            const active =
              !isDrawer &&
              (pathname === href || (href !== `/${role}` && pathname.startsWith(href)));
            const displayBadge = isDrawer && role !== 'manager' ? unreadCount : badge;
            const content = (
              <>
                <div className="relative">
                  <Icon size={22} className={active ? accentTextClass[role] : 'text-muted'} />
                  {displayBadge && displayBadge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                      {displayBadge > 99 ? '99+' : displayBadge}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    active ? accentTextClass[role] : 'text-muted'
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
                  onClick={() => {
                    if (role === 'manager' || role === 'admin') {
                      setShowMoreSheet(true);
                    } else {
                      setShowAccountDrawer(true);
                    }
                  }}
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
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all relative',
                  active ? 'opacity-100' : 'opacity-50'
                )}
              >
                {content}
              </Link>
            );
          },
          'mobile-nav'
        )}
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 glass-dark rounded-t-3xl border-t border-white/8 shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: accentColor[role] }} />
              </div>
              <div className="p-5 space-y-1">
                {profile && (
                  <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-midnight text-sm font-bold">
                      {`${profile.first_name?.charAt(0) ?? ''}${profile.last_name?.charAt(0) ?? ''}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lr-white text-sm font-semibold">
                        {profile.first_name} {profile.last_name}
                      </p>
                      <p className="text-muted text-xs">{profile.email}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-wider text-muted px-3 mb-2">
                  Account
                </p>
                {safeMap(
                  [
                    {
                      label: 'Notifications',
                      href: '/resident/notifications',
                      icon: CalendarDays,
                      badge: unreadCount,
                    },
                    { label: 'Profile', href: '/resident/profile', icon: User },
                    { label: 'Events', href: '/resident/events', icon: CalendarDays },
                    { label: 'Favorites', href: '/resident/favorites', icon: ShoppingBag },
                  ],
                  ({ label, href, icon: Icon, badge }) => (
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
                  ),
                  'account-drawer'
                )}
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

      {/* More Sheet for Manager / Admin */}
      <ResponsiveModal open={showMoreSheet} onOpenChange={setShowMoreSheet}>
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            {role === 'admin' ? 'Platform Menu' : 'Manager Menu'}
          </p>
          <div className="space-y-1">
            {safeMap(
              role === 'admin' ? adminFullNav : managerFullNav,
              (item) => {
                if (isGroup(item)) {
                  const isOpen = !collapsedGroups[item.label];
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-lr-white hover:bg-white/5 transition-colors"
                      >
                        <span>{item.label}</span>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
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
                              {safeMap(
                                item.children,
                                (child) => (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => setShowMoreSheet(false)}
                                    className={cn(
                                      'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium',
                                      isLeafActive(pathname, child.href)
                                        ? 'text-purple-accent bg-purple-accent/10'
                                        : 'text-muted hover:text-lr-white hover:bg-white/5'
                                    )}
                                  >
                                    <child.icon size={16} />
                                    {child.label}
                                  </Link>
                                ),
                                'group-children'
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreSheet(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                      isLeafActive(pathname, item.href)
                        ? 'text-purple-accent bg-purple-accent/10'
                        : 'text-muted hover:text-lr-white hover:bg-white/5'
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              },
              'more-sheet'
            )}
          </div>
          <div className="border-t border-white/[0.07] my-3" />
          <button
            type="button"
            onClick={() => {
              setShowMoreSheet(false);
              handleSignOut();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-lr-white hover:bg-white/5 transition-colors w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </ResponsiveModal>
    </>
  );
}
