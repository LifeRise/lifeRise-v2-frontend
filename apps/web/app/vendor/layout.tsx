import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { PageTracker } from '@/components/pwa/PageTracker';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-midnight">
      <Sidebar role="vendor" />
      <MobileNav role="vendor" />
      <PageTracker />
      <main className="lg:pl-64 pb-20 lg:pb-0 min-h-screen">{children}</main>
    </div>
  );
}
