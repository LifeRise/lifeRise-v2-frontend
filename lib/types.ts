// ─── Base ───────────────────────────────────────────────────────
export type Role = "resident" | "vendor" | "manager" | null;

export type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled";
export type KanbanColumn = "new" | "accepted" | "inProgress";
export type ScheduleStatus = "in-progress" | "upcoming" | "available" | "booked" | "blocked";
export type Trend = "up" | "down" | "stable";
export type NotificationType = "booking" | "promo" | "system" | "alert";
export type PaymentCardType = "visa" | "mastercard" | "amex";
export type VendorAppStatus = "pending" | "approved" | "rejected";
export type ResidentStatus = "active" | "inactive";
export type EarningStatus = "paid" | "pending";

// ─── Vendor / Service ────────────────────────────────────────────
export interface Vendor {
  id: string;
  name: string;
  specialty: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  available: boolean;
  initials: string;
  gradient: string;
  badge: string | null;
}

export interface ServiceDetail extends Vendor {
  description: string;
  tags: string[];
  portfolio: string[];
  estimatedDuration: string;
  cancellationPolicy: string;
}

export interface VendorServiceOffering {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  duration: string;
  description: string;
  isActive: boolean;
  bookingsCount: number;
  viewsCount: number;
}

// ─── Resident ───────────────────────────────────────────────────
export interface ResidentBooking {
  id: string;
  vendor: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
  amount: string;
  avatar: string;
  history?: BookingHistoryEntry[];
  rating?: number;
  review?: string;
  isRecurring?: boolean;
}

export interface BookingHistoryEntry {
  status: string;
  timestamp: string;
  note: string;
}

export interface PaymentMethod {
  id: string;
  type: PaymentCardType;
  last4: string;
  expiry: string;
  isDefault: boolean;
  cardholderName: string;
}

export interface ResidentProfile {
  name: string;
  email: string;
  avatar?: string;
  unit: string;
  phone: string;
  moveInDate: string;
  preferences: {
    notifications: boolean;
    marketing: boolean;
    sms: boolean;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
  actionUrl?: string;
}

// ─── Event ──────────────────────────────────────────────────────
export interface CommunityEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  spots: number;
  interested: number;
  gradient: string;
}

// ─── Vendor Kanban ──────────────────────────────────────────────
export interface KanbanCard {
  id: string;
  client: string;
  service: string;
  time: string;
  address: string;
  price: string;
  isNew: boolean;
  elapsed?: string;
}

export interface KanbanData {
  new: KanbanCard[];
  accepted: KanbanCard[];
  inProgress: KanbanCard[];
}

// ─── Vendor Schedule ────────────────────────────────────────────
export interface VendorScheduleItem {
  id: string;
  client: string;
  service: string;
  time: string;
  duration: string;
  status: "in-progress" | "upcoming";
}

export interface CalendarSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  client?: string;
  service?: string;
  status: ScheduleStatus;
}

// ─── Vendor Earnings ────────────────────────────────────────────
export interface EarningsBreakdown {
  jobs: EarningJob[];
  weeklyTotal: number;
  monthlyTotal: number;
  pendingPayout: number;
  ytdTotal: number;
}

export interface EarningJob {
  id: string;
  client: string;
  service: string;
  date: string;
  amount: number;
  commission: number;
  net: number;
  status: EarningStatus;
}

export interface WeeklyEarning {
  day: string;
  amount: number;
  /** Pre-computed Tailwind height class for the mini bar chart in landing page */
  barClass?: string;
}

// ─── Vendor Profile ─────────────────────────────────────────────
export interface VendorProfile {
  name: string;
  email: string;
  avatar?: string;
  bio: string;
  specialties: string[];
  serviceRadius: string;
  joinedDate: string;
  idVerified: boolean;
}

// ─── Manager Analytics ──────────────────────────────────────────
export interface AnalyticsTimeSeries {
  date: string;
  bookings: number;
  revenue: number;
  newResidents: number;
  complaints: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
  bookings: number;
  color: string;
}

export interface EngagementSlice {
  name: string;
  value: number;
  color: string;
  /** Pre-computed Tailwind bg class for the legend dot in landing page */
  dotClass?: string;
}

// ─── Manager Residents ──────────────────────────────────────────
export interface ResidentDirectoryEntry {
  id: string;
  name: string;
  unit: string;
  building: string;
  email: string;
  phone: string;
  status: ResidentStatus;
  lastActivity: string;
  totalBookings: number;
  outstandingBalance: number;
}

// ─── Manager Vendors ────────────────────────────────────────────
export interface VendorApplication {
  id: string;
  name: string;
  email: string;
  specialty: string;
  appliedDate: string;
  status: VendorAppStatus;
  documents: string[];
  rating: number;
  totalJobs: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  specialty: string;
  bookings: number;
  rating: number;
  earnings: string;
  trend: Trend;
}

// ─── Manager Announcements ──────────────────────────────────────
export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  category: string;
  urgent: boolean;
}
