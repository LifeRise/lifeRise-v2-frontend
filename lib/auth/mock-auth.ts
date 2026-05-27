"use client";

/**
 * Mock Supabase Auth implementation for offline/demo use.
 * Stores users and sessions in localStorage.
 * Swapping to real Supabase only requires filling in .env.local.
 */

import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
  Provider,
} from "@supabase/supabase-js";

const MOCK_USERS_KEY = "liferise_mock_users";
const MOCK_SESSION_KEY = "liferise_mock_session";
const MOCK_PROFILES_KEY = "liferise_mock_profiles";

export interface MockProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "resident" | "vendor" | "manager";
  approval_status: "pending" | "approved" | "rejected";
  onboarding_completed: boolean;
  ein_tax_id?: string;
  description?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  return "mock-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getUsers(): Record<string, { password: string; user: User }> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setUsers(users: Record<string, { password: string; user: User }>) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

function getProfiles(): Record<string, MockProfile> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_PROFILES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setProfiles(profiles: Record<string, MockProfile>) {
  localStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(profiles));
}

function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setSession(session: Session | null) {
  if (session) {
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(MOCK_SESSION_KEY);
  }
}

function createMockUser(email: string, metadata: Record<string, unknown>): User {
  const id = generateId();
  return {
    id,
    email,
    user_metadata: metadata,
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    confirmation_sent_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    phone: "",
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    role: "authenticated",
    updated_at: new Date().toISOString(),
    identities: [],
    factors: [],
  } as User;
}

function createMockSession(user: User): Session {
  return {
    access_token: "mock-token-" + generateId(),
    refresh_token: "mock-refresh-" + generateId(),
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  } as Session;
}

const listeners = new Set<
  (event: AuthChangeEvent, session: Session | null) => void
>();

function notify(event: AuthChangeEvent, session: Session | null) {
  listeners.forEach((cb) => cb(event, session));
}

export const mockAuth = {
  signUp: async ({
    email,
    password,
    options,
  }: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }) => {
    await new Promise((r) => setTimeout(r, 600));
    const users = getUsers();
    if (users[email]) {
      throw { message: "User already registered" };
    }
    const user = createMockUser(email, options?.data ?? {});
    users[email] = { password, user };
    setUsers(users);

    // Create profile
    const profiles = getProfiles();
    const role = (options?.data?.role as MockProfile["role"]) ?? "resident";
    profiles[user.id] = {
      id: user.id,
      email,
      first_name: (options?.data?.first_name as string) ?? "",
      last_name: (options?.data?.last_name as string) ?? "",
      phone: (options?.data?.phone as string) ?? "",
      role,
      approval_status: role === "vendor" ? "pending" : "approved",
      onboarding_completed: false,
      ein_tax_id: (options?.data?.ein_tax_id as string) ?? undefined,
      description: (options?.data?.description as string) ?? undefined,
      avatar_url: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProfiles(profiles);

    return { data: { user, session: null }, error: null };
  },

  signInWithPassword: async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    await new Promise((r) => setTimeout(r, 600));
    const users = getUsers();
    const record = users[email];
    if (!record || record.password !== password) {
      throw { message: "Invalid login credentials" };
    }
    const session = createMockSession(record.user);
    setSession(session);
    notify("SIGNED_IN", session);
    return { data: { user: record.user, session }, error: null };
  },

  signInWithOAuth: async ({
    provider,
    options,
  }: {
    provider: Provider;
    options?: { redirectTo?: string };
  }) => {
    await new Promise((r) => setTimeout(r, 800));
    // Simulate Google OAuth by creating a mock Google user
    const email = "google-user-" + generateId() + "@example.com";
    const users = getUsers();
    let user: User;
    let existing = Object.values(users).find((u) => u.user.email === email);

    if (existing) {
      user = existing.user;
    } else {
      user = createMockUser(email, {
        full_name: "Google User",
        avatar_url: "https://ui-avatars.com/api/?name=Google+User",
        provider,
      });
      users[email] = { password: "oauth-no-password", user };
      setUsers(users);

      const profiles = getProfiles();
      profiles[user.id] = {
        id: user.id,
        email,
        first_name: "Google",
        last_name: "User",
        phone: "",
        role: "resident",
        approval_status: "approved",
        onboarding_completed: false,
        avatar_url: "https://ui-avatars.com/api/?name=Google+User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfiles(profiles);
    }

    const session = createMockSession(user);
    setSession(session);
    notify("SIGNED_IN", session);

    // In real OAuth, redirect happens. Here we simulate it by returning a URL
    // that the caller can use. For mock, we'll just let the caller handle redirect.
    return {
      data: { url: options?.redirectTo ?? "/resident" },
      error: null,
    };
  },

  signOut: async () => {
    await new Promise((r) => setTimeout(r, 300));
    setSession(null);
    notify("SIGNED_OUT", null);
    return { error: null };
  },

  getSession: async () => {
    await new Promise((r) => setTimeout(r, 50));
    const session = getSession();
    return { data: { session }, error: null };
  },

  getUser: async () => {
    await new Promise((r) => setTimeout(r, 50));
    const session = getSession();
    return { data: { user: session?.user ?? null }, error: null };
  },

  resetPasswordForEmail: async (email: string) => {
    await new Promise((r) => setTimeout(r, 600));
    const users = getUsers();
    if (!users[email]) {
      // Don't leak whether email exists
      return { data: {}, error: null };
    }
    return { data: {}, error: null };
  },

  updateUser: async ({
    password,
  }: {
    password: string;
  }) => {
    await new Promise((r) => setTimeout(r, 400));
    const session = getSession();
    if (!session) throw { message: "Not authenticated" };
    const users = getUsers();
    const entry = Object.entries(users).find(
      ([_, v]) => v.user.id === session.user.id
    );
    if (entry) {
      entry[1].password = password;
      setUsers(users);
    }
    return { data: { user: session.user }, error: null };
  },

  onAuthStateChange: (
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) => {
    listeners.add(callback);
    // Emit current state immediately
    const session = getSession();
    callback(session ? "INITIAL_SESSION" : "SIGNED_OUT", session);

    return {
      data: {
        subscription: {
          unsubscribe: () => listeners.delete(callback),
        },
      },
    };
  },
};

export function getMockProfile(userId: string): MockProfile | null {
  return getProfiles()[userId] ?? null;
}

export function updateMockProfile(
  userId: string,
  updates: Partial<MockProfile>
): MockProfile | null {
  const profiles = getProfiles();
  if (!profiles[userId]) return null;
  profiles[userId] = { ...profiles[userId], ...updates, updated_at: new Date().toISOString() };
  setProfiles(profiles);
  return profiles[userId];
}

export function getAllMockProfiles(): MockProfile[] {
  return Object.values(getProfiles());
}

export function seedMockData() {
  // Seed a demo manager, approved vendor, and resident for quick testing
  const users = getUsers();
  const profiles = getProfiles();

  if (Object.keys(users).length > 0) return; // Already seeded

  const managerUser = createMockUser("manager@liferise.demo", {
    first_name: "Admin",
    last_name: "Manager",
    role: "manager",
  });
  users["manager@liferise.demo"] = { password: "Manager123!", user: managerUser };
  profiles[managerUser.id] = {
    id: managerUser.id,
    email: "manager@liferise.demo",
    first_name: "Admin",
    last_name: "Manager",
    phone: "+1234567890",
    role: "manager",
    approval_status: "approved",
    onboarding_completed: true,
    avatar_url: "https://ui-avatars.com/api/?name=Admin+Manager",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const vendorUser = createMockUser("vendor@liferise.demo", {
    first_name: "Marcus",
    last_name: "Rivers",
    role: "vendor",
  });
  users["vendor@liferise.demo"] = { password: "Vendor123!", user: vendorUser };
  profiles[vendorUser.id] = {
    id: vendorUser.id,
    email: "vendor@liferise.demo",
    first_name: "Marcus",
    last_name: "Rivers",
    phone: "+1234567891",
    role: "vendor",
    approval_status: "approved",
    onboarding_completed: true,
    ein_tax_id: "12-3456789",
    description: "Professional cleaning and maintenance services.",
    avatar_url: "https://ui-avatars.com/api/?name=Marcus+Rivers",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const pendingVendor = createMockUser("pending@liferise.demo", {
    first_name: "Sarah",
    last_name: "Pending",
    role: "vendor",
  });
  users["pending@liferise.demo"] = { password: "Pending123!", user: pendingVendor };
  profiles[pendingVendor.id] = {
    id: pendingVendor.id,
    email: "pending@liferise.demo",
    first_name: "Sarah",
    last_name: "Pending",
    phone: "+1234567892",
    role: "vendor",
    approval_status: "pending",
    onboarding_completed: false,
    ein_tax_id: "98-7654321",
    description: "New wellness provider awaiting approval.",
    avatar_url: "https://ui-avatars.com/api/?name=Sarah+Pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const residentUser = createMockUser("resident@liferise.demo", {
    first_name: "Sarah",
    last_name: "Mitchell",
    role: "resident",
  });
  users["resident@liferise.demo"] = { password: "Resident123!", user: residentUser };
  profiles[residentUser.id] = {
    id: residentUser.id,
    email: "resident@liferise.demo",
    first_name: "Sarah",
    last_name: "Mitchell",
    phone: "+1234567893",
    role: "resident",
    approval_status: "approved",
    onboarding_completed: true,
    avatar_url: "https://ui-avatars.com/api/?name=Sarah+Mitchell",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  setUsers(users);
  setProfiles(profiles);
}
