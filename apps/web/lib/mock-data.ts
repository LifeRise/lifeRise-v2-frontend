import type {
  Vendor,
  ServiceDetail,
  ResidentBooking,
  CommunityEvent,
  KanbanData,
  WeeklyEarning,
  EngagementSlice,
  LeaderboardEntry,
  Announcement,
  ResidentProfile,
  PaymentMethod,
  NotificationItem,
  VendorProfile,
  EarningsBreakdown,
  VendorServiceOffering,
  VendorScheduleItem,
  CalendarSlot,
  ResidentDirectoryEntry,
  VendorApplication,
  AnalyticsTimeSeries,
  CategoryRevenue,
} from "./types";
import type { Booking } from "./api/bookings";
import type { Service } from "./api/services";

// ─── Vendors / Services ─────────────────────────────────────────
export const vendors: Vendor[] = [
  { id: "v1", name: "Maya Chen", specialty: "Deep Tissue Massage", category: "Wellness", rating: 4.9, reviews: 127, price: "$85/hr", available: true, initials: "MC", gradient: "from-emerald-700 to-teal-800", badge: "Top Rated" },
  { id: "v2", name: "Carlos Rivera", specialty: "Healthy Meal Prep", category: "Meal Prep", rating: 4.8, reviews: 89, price: "$120/wk", available: true, initials: "CR", gradient: "from-amber-700 to-orange-800", badge: "Available Today" },
  { id: "v3", name: "Aria Johnson", specialty: "Personal Training", category: "Fitness", rating: 4.9, reviews: 203, price: "$75/session", available: false, initials: "AJ", gradient: "from-blue-700 to-indigo-800", badge: null },
  { id: "v4", name: "David Kim", specialty: "Home Deep Clean", category: "Home Care", rating: 4.7, reviews: 156, price: "$95/visit", available: true, initials: "DK", gradient: "from-purple-700 to-violet-800", badge: "Available Today" },
  { id: "v5", name: "Luna Park", specialty: "Dog Walking & Care", category: "Pets", rating: 5.0, reviews: 67, price: "$25/walk", available: true, initials: "LP", gradient: "from-pink-700 to-rose-800", badge: "New" },
  { id: "v6", name: "James Wilson", specialty: "Yoga & Meditation", category: "Wellness", rating: 4.8, reviews: 94, price: "$60/session", available: false, initials: "JW", gradient: "from-cyan-700 to-sky-800", badge: null },
];

export const serviceDetails: ServiceDetail[] = vendors.map((v) => ({
  ...v,
  description: `Professional ${v.specialty.toLowerCase()} services tailored to your needs. Highly rated with ${v.reviews}+ satisfied clients.`,
  tags: [v.category, v.specialty.split(" ").pop() || "", "Top Rated"],
  portfolio: ["portfolio-1", "portfolio-2", "portfolio-3"],
  estimatedDuration: v.category === "Meal Prep" ? "Weekly" : v.category === "Pets" ? "30 min" : "60 min",
  cancellationPolicy: "Free cancellation up to 24 hours before appointment.",
}));

export const categories = ["All", "Wellness", "Meal Prep", "Fitness", "Home Care", "Pets", "Events"] as const;

// ─── Resident Bookings ───────────────────────────────────────────
export const residentBookings: ResidentBooking[] = [
  { id: "rb1", vendor: "Maya Chen", service: "Deep Tissue Massage", date: "May 22, 2026", time: "3:00 PM", status: "confirmed", amount: "$85", avatar: "MC" },
  { id: "rb2", vendor: "Carlos Rivera", service: "Weekly Meal Prep", date: "May 23, 2026", time: "10:00 AM", status: "pending", amount: "$120", avatar: "CR" },
  { id: "rb3", vendor: "David Kim", service: "Home Deep Clean", date: "May 18, 2026", time: "9:00 AM", status: "completed", amount: "$95", avatar: "DK" },
  { id: "rb4", vendor: "Aria Johnson", service: "Personal Training", date: "May 15, 2026", time: "5:00 PM", status: "completed", amount: "$75", avatar: "AJ" },
  { id: "rb5", vendor: "Maya Chen", service: "Swedish Massage", date: "May 10, 2026", time: "2:00 PM", status: "cancelled", amount: "$75", avatar: "MC" },
];

export const bookingHistoryMap: Record<string, ResidentBooking> = {
  rb1: {
    ...residentBookings[0],
    history: [
      { status: "Booked", timestamp: "May 20, 2026 10:30 AM", note: "Booking confirmed by resident" },
      { status: "Confirmed", timestamp: "May 20, 2026 11:00 AM", note: "Vendor accepted the booking" },
    ],
    isRecurring: false,
  },
  rb2: {
    ...residentBookings[1],
    history: [
      { status: "Booked", timestamp: "May 19, 2026 2:00 PM", note: "Booking requested" },
      { status: "Pending", timestamp: "May 19, 2026 2:00 PM", note: "Awaiting vendor confirmation" },
    ],
    isRecurring: true,
  },
  rb3: {
    ...residentBookings[2],
    history: [
      { status: "Booked", timestamp: "May 16, 2026 9:00 AM", note: "Booking confirmed" },
      { status: "Completed", timestamp: "May 18, 2026 10:30 AM", note: "Service completed. Resident rated 5 stars." },
    ],
    rating: 5,
    review: "David did an incredible job. The apartment looks brand new!",
    isRecurring: false,
  },
  rb4: {
    ...residentBookings[3],
    history: [
      { status: "Booked", timestamp: "May 12, 2026 3:00 PM", note: "Booking confirmed" },
      { status: "Completed", timestamp: "May 15, 2026 6:15 PM", note: "Training session completed" },
    ],
    rating: 4,
    review: "Great workout, very motivating!",
    isRecurring: true,
  },
  rb5: {
    ...residentBookings[4],
    history: [
      { status: "Booked", timestamp: "May 8, 2026 11:00 AM", note: "Booking confirmed" },
      { status: "Cancelled", timestamp: "May 9, 2026 9:00 AM", note: "Cancelled by resident. Refund processed." },
    ],
    isRecurring: false,
  },
};

// ─── Events ─────────────────────────────────────────────────────
export const events: CommunityEvent[] = [
  { id: "e1", title: "Rooftop Yoga & Sunrise Meditation", date: "May 23", time: "6:30 AM", location: "Rooftop Terrace", spots: 8, interested: 24, gradient: "from-teal-700 to-emerald-800" },
  { id: "e2", title: "Healthy Cooking Masterclass", date: "May 25", time: "5:00 PM", location: "Community Kitchen", spots: 12, interested: 31, gradient: "from-amber-700 to-orange-800" },
  { id: "e3", title: "Community Fitness Challenge", date: "May 28", time: "7:00 AM", location: "Fitness Center", spots: 0, interested: 47, gradient: "from-indigo-700 to-purple-800" },
  { id: "e4", title: "Pet Meetup & Social Hour", date: "May 30", time: "3:00 PM", location: "Dog Park", spots: 20, interested: 15, gradient: "from-pink-700 to-rose-800" },
];

// ─── Vendor Kanban ───────────────────────────────────────────────
export const kanbanData: KanbanData = {
  new: [
    { id: "k1", client: "Sarah M.", service: "Deep Tissue Massage", time: "2:00 PM", address: "Apt 4B", price: "$85", isNew: true },
    { id: "k2", client: "Tom K.", service: "Swedish Massage", time: "4:30 PM", address: "Apt 12A", price: "$75", isNew: true },
    { id: "k5", client: "Lisa R.", service: "Hot Stone Therapy", time: "6:00 PM", address: "Apt 8D", price: "$110", isNew: true },
  ],
  accepted: [
    { id: "k3", client: "Emma L.", service: "Hot Stone Therapy", time: "12:00 PM", address: "Apt 7C", price: "$110", isNew: false },
    { id: "k6", client: "James P.", service: "Deep Tissue Massage", time: "11:00 AM", address: "Apt 2F", price: "$85", isNew: false },
  ],
  inProgress: [
    { id: "k4", client: "David R.", service: "Deep Tissue Massage", time: "10:00 AM", address: "Apt 3A", price: "$85", isNew: false, elapsed: "42 min" },
  ],
};

// ─── Vendor Earnings ─────────────────────────────────────────────
export const earningsData: WeeklyEarning[] = [
  { day: "Mon", amount: 120, barClass: "h-[38%]" },
  { day: "Tue", amount: 95,  barClass: "h-[30%]" },
  { day: "Wed", amount: 210, barClass: "h-[66%]" },
  { day: "Thu", amount: 185, barClass: "h-[58%]" },
  { day: "Fri", amount: 147, barClass: "h-[46%]" },
  { day: "Sat", amount: 320, barClass: "h-full"  },
  { day: "Sun", amount: 90,  barClass: "h-[28%]" },
];

export const monthlyEarningsData: WeeklyEarning[] = [
  { day: "Week 1", amount: 840 },
  { day: "Week 2", amount: 1120 },
  { day: "Week 3", amount: 980 },
  { day: "Week 4", amount: 1350 },
];

export const yearlyEarningsData: WeeklyEarning[] = [
  { day: "Jan", amount: 3200 },
  { day: "Feb", amount: 4100 },
  { day: "Mar", amount: 3800 },
  { day: "Apr", amount: 5200 },
  { day: "May", amount: 4290 },
];

export const earningsBreakdown: EarningsBreakdown = {
  jobs: [
    { id: "j1", client: "Sarah M.", service: "Deep Tissue Massage", date: "May 20", amount: 85, commission: 12.75, net: 72.25, status: "paid" },
    { id: "j2", client: "Tom K.", service: "Swedish Massage", date: "May 19", amount: 75, commission: 11.25, net: 63.75, status: "paid" },
    { id: "j3", client: "Emma L.", service: "Hot Stone Therapy", date: "May 18", amount: 110, commission: 16.5, net: 93.5, status: "paid" },
    { id: "j4", client: "David R.", service: "Deep Tissue Massage", date: "May 17", amount: 85, commission: 12.75, net: 72.25, status: "pending" },
    { id: "j5", client: "Lisa R.", service: "Hot Stone Therapy", date: "May 16", amount: 110, commission: 16.5, net: 93.5, status: "pending" },
    { id: "j6", client: "James P.", service: "Deep Tissue Massage", date: "May 15", amount: 85, commission: 12.75, net: 72.25, status: "paid" },
  ],
  weeklyTotal: 1167,
  monthlyTotal: 4290,
  pendingPayout: 340,
  ytdTotal: 20590,
};

// ─── Vendor Schedule ─────────────────────────────────────────────
export const vendorSchedule: VendorScheduleItem[] = [
  { id: "s1", client: "David R.", service: "Deep Tissue Massage", time: "10:00 AM", duration: "60 min", status: "in-progress" },
  { id: "s2", client: "Emma L.", service: "Hot Stone Therapy", time: "12:00 PM", duration: "75 min", status: "upcoming" },
  { id: "s3", client: "Sarah M.", service: "Deep Tissue Massage", time: "2:00 PM", duration: "60 min", status: "upcoming" },
  { id: "s4", client: "Tom K.", service: "Swedish Massage", time: "4:30 PM", duration: "60 min", status: "upcoming" },
];

export const scheduleSlots: CalendarSlot[] = [
  { id: "slot-1", day: "Mon", startTime: "10:00", endTime: "11:00", client: "David R.", service: "Deep Tissue Massage", status: "booked" },
  { id: "slot-2", day: "Mon", startTime: "12:00", endTime: "13:15", client: "Emma L.", service: "Hot Stone Therapy", status: "booked" },
  { id: "slot-3", day: "Mon", startTime: "14:00", endTime: "15:00", client: "Sarah M.", service: "Deep Tissue Massage", status: "booked" },
  { id: "slot-4", day: "Mon", startTime: "16:30", endTime: "17:30", client: "Tom K.", service: "Swedish Massage", status: "booked" },
  { id: "slot-5", day: "Tue", startTime: "09:00", endTime: "10:00", status: "available" },
  { id: "slot-6", day: "Tue", startTime: "11:00", endTime: "12:00", client: "Lisa R.", service: "Hot Stone Therapy", status: "booked" },
  { id: "slot-7", day: "Tue", startTime: "14:00", endTime: "15:00", status: "blocked" },
  { id: "slot-8", day: "Wed", startTime: "10:00", endTime: "11:00", client: "James P.", service: "Deep Tissue Massage", status: "booked" },
  { id: "slot-9", day: "Wed", startTime: "13:00", endTime: "14:00", status: "available" },
  { id: "slot-10", day: "Thu", startTime: "09:00", endTime: "10:00", status: "available" },
  { id: "slot-11", day: "Thu", startTime: "15:00", endTime: "16:00", client: "Sarah M.", service: "Swedish Massage", status: "booked" },
  { id: "slot-12", day: "Fri", startTime: "10:00", endTime: "11:00", status: "available" },
  { id: "slot-13", day: "Fri", startTime: "14:00", endTime: "15:00", status: "blocked" },
  { id: "slot-14", day: "Sat", startTime: "09:00", endTime: "17:00", status: "available" },
];

// ─── Vendor Services ─────────────────────────────────────────────
export const vendorServices: VendorServiceOffering[] = [
  { id: "vs1", name: "Deep Tissue Massage", category: "Wellness", basePrice: 85, duration: "60 min", description: "Intensive muscle therapy for chronic tension and pain relief.", isActive: true, bookingsCount: 47, viewsCount: 312 },
  { id: "vs2", name: "Swedish Massage", category: "Wellness", basePrice: 75, duration: "60 min", description: "Relaxing full-body massage with gentle to medium pressure.", isActive: true, bookingsCount: 28, viewsCount: 198 },
  { id: "vs3", name: "Hot Stone Therapy", category: "Wellness", basePrice: 110, duration: "75 min", description: "Heated basalt stones placed on key points for deep relaxation.", isActive: true, bookingsCount: 19, viewsCount: 145 },
  { id: "vs4", name: "Sports Massage", category: "Fitness", basePrice: 95, duration: "60 min", description: "Targeted therapy for athletes and active individuals.", isActive: false, bookingsCount: 0, viewsCount: 67 },
];

// ─── Vendor Profile ──────────────────────────────────────────────
export const vendorProfile: VendorProfile = {
  name: "Marcus Johnson",
  email: "marcus.j@liferise.com",
  bio: "Licensed massage therapist with 8+ years of experience specializing in deep tissue and therapeutic techniques. Certified in hot stone therapy and sports recovery.",
  specialties: ["Deep Tissue", "Swedish", "Hot Stone", "Sports Recovery"],
  serviceRadius: "15 miles",
  joinedDate: "March 2023",
  idVerified: true,
};

// ─── Manager Analytics ───────────────────────────────────────────
export const engagementData: EngagementSlice[] = [
  { name: "Wellness",  value: 35, color: "#00D4AA", dotClass: "bg-teal"          },
  { name: "Home Care", value: 25, color: "#F5A623", dotClass: "bg-gold"          },
  { name: "Fitness",   value: 20, color: "#818CF8", dotClass: "bg-purple-accent" },
  { name: "Meal Prep", value: 12, color: "#F472B6", dotClass: "bg-pink-400"      },
  { name: "Pets",      value: 8,  color: "#34D399", dotClass: "bg-emerald-400"   },
];

export const vendorLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Maya Chen", specialty: "Wellness", bookings: 47, rating: 4.9, earnings: "$3,245", trend: "up", initials: "MC", gradient: "from-emerald-700 to-teal-800", bio: "Licensed massage therapist, 6+ years in deep tissue and prenatal care.", completionRate: 98, avgResponseTime: "< 30 min", reviewCount: 127, topService: "Deep Tissue Massage" },
  { rank: 2, name: "Carlos Rivera", specialty: "Meal Prep", bookings: 38, rating: 4.8, earnings: "$2,890", trend: "up", initials: "CR", gradient: "from-amber-700 to-orange-800", bio: "Certified nutritionist and personal chef specialising in healthy weekly meal plans.", completionRate: 97, avgResponseTime: "< 1 hr", reviewCount: 89, topService: "Weekly Meal Prep" },
  { rank: 3, name: "Aria Johnson", specialty: "Fitness", bookings: 35, rating: 4.9, earnings: "$2,100", trend: "stable", initials: "AJ", gradient: "from-blue-700 to-indigo-800", bio: "NASM-certified personal trainer focused on strength, mobility, and athletic performance.", completionRate: 96, avgResponseTime: "< 2 hr", reviewCount: 203, topService: "Personal Training" },
  { rank: 4, name: "David Kim", specialty: "Home Care", bookings: 29, rating: 4.7, earnings: "$1,950", trend: "down", initials: "DK", gradient: "from-purple-700 to-violet-800", bio: "Professional cleaner using eco-friendly products with meticulous attention to detail.", completionRate: 94, avgResponseTime: "< 1 hr", reviewCount: 156, topService: "Home Deep Clean" },
  { rank: 5, name: "Luna Park", specialty: "Pets", bookings: 22, rating: 5.0, earnings: "$1,320", trend: "up", initials: "LP", gradient: "from-pink-700 to-rose-800", bio: "Certified dog trainer and licensed pet groomer with a lifelong passion for animals.", completionRate: 100, avgResponseTime: "< 30 min", reviewCount: 67, topService: "Dog Walking & Care" },
  { rank: 6, name: "James Wilson", specialty: "Wellness", bookings: 18, rating: 4.8, earnings: "$1,080", trend: "stable", initials: "JW", gradient: "from-cyan-700 to-sky-800", bio: "RYT-500 yoga instructor and mindfulness coach offering group and private sessions.", completionRate: 95, avgResponseTime: "< 1 hr", reviewCount: 94, topService: "Yoga & Meditation" },
];

export const analyticsTimeSeries: AnalyticsTimeSeries[] = [
  { date: "May 1", bookings: 12, revenue: 980, newResidents: 2, complaints: 0 },
  { date: "May 5", bookings: 18, revenue: 1420, newResidents: 1, complaints: 1 },
  { date: "May 10", bookings: 15, revenue: 1150, newResidents: 3, complaints: 0 },
  { date: "May 15", bookings: 22, revenue: 1890, newResidents: 0, complaints: 2 },
  { date: "May 20", bookings: 19, revenue: 1620, newResidents: 1, complaints: 0 },
];

export const analyticsTimeSeries7d: AnalyticsTimeSeries[] = [
  { date: "May 15", bookings: 5, revenue: 420, newResidents: 0, complaints: 1 },
  { date: "May 16", bookings: 8, revenue: 680, newResidents: 1, complaints: 0 },
  { date: "May 17", bookings: 6, revenue: 510, newResidents: 0, complaints: 0 },
  { date: "May 18", bookings: 11, revenue: 940, newResidents: 0, complaints: 1 },
  { date: "May 19", bookings: 9, revenue: 760, newResidents: 1, complaints: 0 },
  { date: "May 20", bookings: 14, revenue: 1150, newResidents: 0, complaints: 0 },
  { date: "May 21", bookings: 12, revenue: 1020, newResidents: 1, complaints: 0 },
];

export const analyticsTimeSeries90d: AnalyticsTimeSeries[] = [
  { date: "Feb 21", bookings: 38, revenue: 2800, newResidents: 5, complaints: 2 },
  { date: "Mar 1", bookings: 45, revenue: 3400, newResidents: 7, complaints: 1 },
  { date: "Mar 15", bookings: 52, revenue: 4100, newResidents: 4, complaints: 3 },
  { date: "Apr 1", bookings: 61, revenue: 5200, newResidents: 9, complaints: 2 },
  { date: "Apr 15", bookings: 74, revenue: 6400, newResidents: 6, complaints: 1 },
  { date: "May 1", bookings: 83, revenue: 7100, newResidents: 8, complaints: 4 },
  { date: "May 15", bookings: 91, revenue: 7800, newResidents: 5, complaints: 2 },
  { date: "May 21", bookings: 99, revenue: 8400, newResidents: 3, complaints: 1 },
];

export const categoryRevenue: CategoryRevenue[] = [
  { category: "Wellness", revenue: 12400, bookings: 142, color: "#00D4AA" },
  { category: "Home Care", revenue: 8900, bookings: 98, color: "#F5A623" },
  { category: "Fitness", revenue: 7200, bookings: 85, color: "#818CF8" },
  { category: "Meal Prep", revenue: 5400, bookings: 64, color: "#F472B6" },
  { category: "Pets", revenue: 3100, bookings: 52, color: "#34D399" },
];

// ─── Manager Residents ───────────────────────────────────────────
export const residentDirectory: ResidentDirectoryEntry[] = [
  { id: "r1", name: "Sarah Mitchell", unit: "4B", building: "Riverside A", email: "sarah.m@riverside.com", phone: "(555) 123-4567", status: "active", lastActivity: "May 20, 2026", totalBookings: 12, outstandingBalance: 0 },
  { id: "r2", name: "Tom Keller", unit: "12A", building: "Riverside A", email: "tom.k@riverside.com", phone: "(555) 234-5678", status: "active", lastActivity: "May 19, 2026", totalBookings: 8, outstandingBalance: 120 },
  { id: "r3", name: "Emma Liu", unit: "7C", building: "Riverside B", email: "emma.l@riverside.com", phone: "(555) 345-6789", status: "active", lastActivity: "May 21, 2026", totalBookings: 24, outstandingBalance: 0 },
  { id: "r4", name: "David Reynolds", unit: "3A", building: "Riverside B", email: "david.r@riverside.com", phone: "(555) 456-7890", status: "inactive", lastActivity: "Apr 15, 2026", totalBookings: 3, outstandingBalance: 0 },
  { id: "r5", name: "Lisa Rodriguez", unit: "8D", building: "Riverside A", email: "lisa.r@riverside.com", phone: "(555) 567-8901", status: "active", lastActivity: "May 18, 2026", totalBookings: 15, outstandingBalance: 85 },
  { id: "r6", name: "James Peterson", unit: "2F", building: "Riverside C", email: "james.p@riverside.com", phone: "(555) 678-9012", status: "active", lastActivity: "May 21, 2026", totalBookings: 6, outstandingBalance: 0 },
];

// ─── Manager Vendors ─────────────────────────────────────────────
export const vendorApplications: VendorApplication[] = [
  { id: "va1", name: "Sophia Green", email: "sophia.g@email.com", specialty: "Wellness", appliedDate: "May 18, 2026", status: "pending", documents: ["license.pdf", "insurance.pdf"], rating: 0, totalJobs: 0, bio: "Certified aromatherapist and holistic wellness practitioner with 5 years of spa experience. Specialises in relaxation and stress-relief therapies.", yearsExperience: 5, phone: "(555) 901-2345" },
  { id: "va2", name: "Daniel Lee", email: "daniel.l@email.com", specialty: "Fitness", appliedDate: "May 15, 2026", status: "pending", documents: ["certification.pdf"], rating: 0, totalJobs: 0, bio: "NASM-certified personal trainer and former collegiate track athlete. Specialises in strength conditioning, weight loss programmes, and sprint coaching.", yearsExperience: 3, phone: "(555) 012-3456" },
  { id: "va3", name: "Nina Patel", email: "nina.p@email.com", specialty: "Home Care", appliedDate: "May 10, 2026", status: "approved", documents: ["license.pdf", "bg-check.pdf", "insurance.pdf"], rating: 4.8, totalJobs: 14, bio: "Professional home organiser and certified cleaner with commercial and residential experience. Background-checked and insured.", yearsExperience: 7, phone: "(555) 123-9999" },
];

// ─── Manager Announcements ───────────────────────────────────────
export const announcements: Announcement[] = [
  { id: "a1", title: "Pool Maintenance Notice", body: "The pool will be closed May 24–25 for scheduled maintenance.", date: "May 21", category: "Maintenance", urgent: false },
  { id: "a2", title: "New Vendor: Healthy Bites Meal Prep", body: "Carlos Rivera has joined LifeRise offering weekly meal prep packages.", date: "May 20", category: "New Service", urgent: false },
  { id: "a3", title: "Elevator B — Temporary Outage", body: "Elevator B is undergoing urgent repairs. Estimated completion: May 22.", date: "May 19", category: "Urgent", urgent: true },
];

// ─── Resident Profile & Payments ─────────────────────────────────
export const residentProfile: ResidentProfile = {
  name: "Sarah Mitchell",
  email: "sarah.m@riverside.com",
  unit: "4B",
  phone: "(555) 123-4567",
  moveInDate: "August 2023",
  preferences: {
    notifications: true,
    marketing: false,
    sms: true,
  },
};

export const paymentMethods: PaymentMethod[] = [
  { id: "pm1", type: "visa", last4: "4242", expiry: "09/28", isDefault: true, cardholderName: "Sarah Mitchell" },
  { id: "pm2", type: "mastercard", last4: "8888", expiry: "12/27", isDefault: false, cardholderName: "Sarah Mitchell" },
];

// ─── Notifications ───────────────────────────────────────────────
export const notifications: NotificationItem[] = [
  { id: "n1", title: "Booking Confirmed", body: "Your Deep Tissue Massage with Maya Chen on May 22 at 3:00 PM is confirmed.", timestamp: "2026-05-20T14:30:00Z", read: false, type: "booking" },
  { id: "n2", title: "Weekly Special", body: "Get 20% off all Home Care services this week only!", timestamp: "2026-05-20T10:00:00Z", read: false, type: "promo" },
  { id: "n3", title: "Pool Maintenance", body: "The pool will be closed May 24–25 for scheduled maintenance.", timestamp: "2026-05-19T09:00:00Z", read: true, type: "alert" },
  { id: "n4", title: "Payment Processed", body: "Your payment of $120 for Weekly Meal Prep has been processed.", timestamp: "2026-05-18T16:00:00Z", read: true, type: "system" },
  { id: "n5", title: "New Event", body: "Community Fitness Challenge on May 28. 47 residents are interested!", timestamp: "2026-05-17T11:00:00Z", read: true, type: "promo" },
];

// ─── Backend-shaped Mock Data (for useBookings / useServices fallbacks) ───────
// Dates are relative to "now" so the demo always shows fresh data.
const _today = new Date();
function _offsetDate(days: number): string {
  const d = new Date(_today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export const apiServices: Service[] = [
  { id: 101, name: "Deep Tissue Massage", slug: "deep-tissue-massage", description: "60-minute targeted release for chronic tension. Includes hot-stone finish.", short_description: "Targeted release for chronic tension.", price: "85.00", currency: "USD", duration: 60, category: { id: 1, name: "Wellness", slug: "wellness" }, provider_id: 201, avg_rating: 4.9, total_reviews: 127, status: "active", images: [], location_type: "on_site" },
  { id: 102, name: "Swedish Relaxation Massage", slug: "swedish-massage", description: "Classic full-body Swedish technique using aromatic oils.", short_description: "Full-body relaxation with aromatic oils.", price: "75.00", currency: "USD", duration: 60, category: { id: 1, name: "Wellness", slug: "wellness" }, provider_id: 201, avg_rating: 4.8, total_reviews: 94, status: "active", images: [], location_type: "on_site" },
  { id: 103, name: "Sports Recovery Session", slug: "sports-recovery", description: "Deep-pressure work for athletes with mobility assessment.", short_description: "Deep recovery for athletes.", price: "110.00", currency: "USD", duration: 90, category: { id: 1, name: "Wellness", slug: "wellness" }, provider_id: 201, avg_rating: 5.0, total_reviews: 52, status: "active", images: [], location_type: "on_site" },
  { id: 104, name: "Prenatal Massage", slug: "prenatal-massage", description: "Gentle, side-lying massage tailored for expectant mothers.", short_description: "Gentle care for expectant mothers.", price: "95.00", currency: "USD", duration: 60, category: { id: 1, name: "Wellness", slug: "wellness" }, provider_id: 201, avg_rating: 4.9, total_reviews: 38, status: "active", images: [], location_type: "on_site" },
  { id: 105, name: "Mobility & Stretch", slug: "mobility-stretch", description: "Guided assisted-stretch routine to improve range of motion.", short_description: "Assisted stretching session.", price: "60.00", currency: "USD", duration: 45, category: { id: 1, name: "Wellness", slug: "wellness" }, provider_id: 201, avg_rating: 4.7, total_reviews: 41, status: "active", images: [], location_type: "on_site" },
  { id: 106, name: "Couples Massage", slug: "couples-massage", description: "Side-by-side massage for two in a candlelit setting.", short_description: "Side-by-side for two.", price: "180.00", currency: "USD", duration: 75, category: { id: 1, name: "Wellness", slug: "wellness" }, provider_id: 201, avg_rating: 4.9, total_reviews: 23, status: "inactive", images: [], location_type: "on_site" },
];

// Vendor-perspective bookings: Marcus Johnson (provider 201) viewing his queue/schedule/earnings.
export const apiBookings: Booking[] = [
  // Today
  { id: 1001, booking_number: "LR-2026-1001", customer_id: 301, service_provider_id: 201, service_id: 101, status: "Confirmed", booking_date: _offsetDate(0), start_time: "10:00:00", end_time: "11:00:00", duration: 60, price: "85.00", final_price: "85.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-3), service_name: "Deep Tissue Massage", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 4B, Riverside Tower" },
  { id: 1002, booking_number: "LR-2026-1002", customer_id: 302, service_provider_id: 201, service_id: 105, status: "Confirmed", booking_date: _offsetDate(0), start_time: "13:30:00", end_time: "14:15:00", duration: 45, price: "60.00", final_price: "60.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-2), service_name: "Mobility & Stretch", customer_name: "Daniel Cho", customer_avatar: "DC", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 12A, Riverside Tower" },
  { id: 1003, booking_number: "LR-2026-1003", customer_id: 303, service_provider_id: 201, service_id: 102, status: "Pending", booking_date: _offsetDate(0), start_time: "16:00:00", end_time: "17:00:00", duration: 60, price: "75.00", final_price: "75.00", currency: "USD", notes: "Prefers lavender oil; mild pressure on shoulders.", payment_status: "authorized", created_at: _offsetDate(0), service_name: "Swedish Relaxation Massage", customer_name: "Priya Sharma", customer_avatar: "PS", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 7C, Riverside Tower" },
  // Tomorrow
  { id: 1004, booking_number: "LR-2026-1004", customer_id: 304, service_provider_id: 201, service_id: 103, status: "Confirmed", booking_date: _offsetDate(1), start_time: "09:00:00", end_time: "10:30:00", duration: 90, price: "110.00", final_price: "110.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-1), service_name: "Sports Recovery Session", customer_name: "Marcus Hill", customer_avatar: "MH", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 9D, Riverside Tower" },
  { id: 1005, booking_number: "LR-2026-1005", customer_id: 305, service_provider_id: 201, service_id: 101, status: "Pending", booking_date: _offsetDate(1), start_time: "15:00:00", end_time: "16:00:00", duration: 60, price: "85.00", final_price: "85.00", currency: "USD", payment_status: "authorized", created_at: _offsetDate(0), service_name: "Deep Tissue Massage", customer_name: "Elena Rossi", customer_avatar: "ER", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 3F, Riverside Tower" },
  // Next 3 days
  { id: 1006, booking_number: "LR-2026-1006", customer_id: 306, service_provider_id: 201, service_id: 104, status: "Confirmed", booking_date: _offsetDate(2), start_time: "11:00:00", end_time: "12:00:00", duration: 60, price: "95.00", final_price: "95.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-1), service_name: "Prenatal Massage", customer_name: "Naomi Park", customer_avatar: "NP", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 14B, Riverside Tower" },
  { id: 1007, booking_number: "LR-2026-1007", customer_id: 307, service_provider_id: 201, service_id: 102, status: "Confirmed", booking_date: _offsetDate(3), start_time: "14:00:00", end_time: "15:00:00", duration: 60, price: "75.00", final_price: "75.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(0), service_name: "Swedish Relaxation Massage", customer_name: "James Okafor", customer_avatar: "JO", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 6A, Riverside Tower" },
  // Last 7 days — completed
  { id: 1008, booking_number: "LR-2026-1008", customer_id: 308, service_provider_id: 201, service_id: 101, status: "Completed", booking_date: _offsetDate(-1), start_time: "10:00:00", end_time: "11:00:00", duration: 60, price: "85.00", final_price: "85.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-5), service_name: "Deep Tissue Massage", customer_name: "Aiko Tanaka", customer_avatar: "AT", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 11E, Riverside Tower" },
  { id: 1009, booking_number: "LR-2026-1009", customer_id: 301, service_provider_id: 201, service_id: 103, status: "Completed", booking_date: _offsetDate(-2), start_time: "16:00:00", end_time: "17:30:00", duration: 90, price: "110.00", final_price: "110.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-7), service_name: "Sports Recovery Session", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 4B, Riverside Tower" },
  { id: 1010, booking_number: "LR-2026-1010", customer_id: 309, service_provider_id: 201, service_id: 102, status: "Completed", booking_date: _offsetDate(-3), start_time: "11:00:00", end_time: "12:00:00", duration: 60, price: "75.00", final_price: "75.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-8), service_name: "Swedish Relaxation Massage", customer_name: "Hassan Ali", customer_avatar: "HA", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 8C, Riverside Tower" },
  { id: 1011, booking_number: "LR-2026-1011", customer_id: 310, service_provider_id: 201, service_id: 105, status: "Completed", booking_date: _offsetDate(-5), start_time: "09:30:00", end_time: "10:15:00", duration: 45, price: "60.00", final_price: "60.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-10), service_name: "Mobility & Stretch", customer_name: "Olivia Brennan", customer_avatar: "OB", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 2A, Riverside Tower" },
  { id: 1012, booking_number: "LR-2026-1012", customer_id: 311, service_provider_id: 201, service_id: 104, status: "Cancelled", booking_date: _offsetDate(-4), start_time: "13:00:00", end_time: "14:00:00", duration: 60, price: "95.00", final_price: "0.00", currency: "USD", payment_status: "refunded", created_at: _offsetDate(-9), service_name: "Prenatal Massage", customer_name: "Layla Hassan", customer_avatar: "LH", provider_name: "Marcus Johnson", provider_avatar: "MJ", address: "Unit 5D, Riverside Tower" },
];

// Resident-perspective bookings: Sarah Mitchell (customer 301) viewing her appointments across multiple vendors.
export const apiResidentBookings: Booking[] = [
  // Upcoming
  { id: 2001, booking_number: "LR-2026-2001", customer_id: 301, service_provider_id: 201, service_id: 101, status: "Confirmed", booking_date: _offsetDate(1), start_time: "15:00:00", end_time: "16:00:00", duration: 60, price: "85.00", final_price: "85.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-2), service_name: "Deep Tissue Massage", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "Maya Chen", provider_avatar: "MC", address: "Unit 4B, Riverside Tower" },
  { id: 2002, booking_number: "LR-2026-2002", customer_id: 301, service_provider_id: 202, service_id: 0, status: "Pending", booking_date: _offsetDate(2), start_time: "10:00:00", end_time: "11:00:00", duration: 60, price: "120.00", final_price: "120.00", currency: "USD", payment_status: "authorized", created_at: _offsetDate(0), service_name: "Weekly Meal Prep", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "Carlos Rivera", provider_avatar: "CR", address: "Unit 4B, Riverside Tower" },
  { id: 2003, booking_number: "LR-2026-2003", customer_id: 301, service_provider_id: 204, service_id: 0, status: "Confirmed", booking_date: _offsetDate(4), start_time: "09:00:00", end_time: "12:00:00", duration: 180, price: "95.00", final_price: "95.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-1), service_name: "Home Deep Clean", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "David Kim", provider_avatar: "DK", address: "Unit 4B, Riverside Tower" },
  // Past
  { id: 2004, booking_number: "LR-2026-2004", customer_id: 301, service_provider_id: 203, service_id: 0, status: "Completed", booking_date: _offsetDate(-3), start_time: "17:00:00", end_time: "18:00:00", duration: 60, price: "75.00", final_price: "75.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-7), service_name: "Personal Training", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "Aria Johnson", provider_avatar: "AJ", address: "Riverside Fitness Center" },
  { id: 2005, booking_number: "LR-2026-2005", customer_id: 301, service_provider_id: 201, service_id: 102, status: "Completed", booking_date: _offsetDate(-7), start_time: "14:00:00", end_time: "15:00:00", duration: 60, price: "75.00", final_price: "75.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-12), service_name: "Swedish Relaxation Massage", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "Maya Chen", provider_avatar: "MC", address: "Unit 4B, Riverside Tower" },
  { id: 2006, booking_number: "LR-2026-2006", customer_id: 301, service_provider_id: 205, service_id: 0, status: "Completed", booking_date: _offsetDate(-10), start_time: "08:00:00", end_time: "08:30:00", duration: 30, price: "25.00", final_price: "25.00", currency: "USD", payment_status: "paid", created_at: _offsetDate(-15), service_name: "Dog Walking & Care", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "Luna Park", provider_avatar: "LP", address: "Riverside Dog Park" },
  // Cancelled
  { id: 2007, booking_number: "LR-2026-2007", customer_id: 301, service_provider_id: 201, service_id: 101, status: "Cancelled", booking_date: _offsetDate(-14), start_time: "14:00:00", end_time: "15:00:00", duration: 60, price: "75.00", final_price: "0.00", currency: "USD", payment_status: "refunded", created_at: _offsetDate(-18), service_name: "Swedish Massage", customer_name: "Sarah Mitchell", customer_avatar: "SM", provider_name: "Maya Chen", provider_avatar: "MC", address: "Unit 4B, Riverside Tower" },
];
