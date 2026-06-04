"use client";

/**
 * Mock Supabase Auth implementation for offline/demo use.
 * Stores users and sessions in localStorage.
 * Supports: email/password, OAuth, magic link, OTP, email confirmation.
 */

import type {
  AuthChangeEvent,
  Session,
  User,
  Provider,
} from "@supabase/supabase-js";

const MOCK_USERS_KEY = "liferise_mock_users";
const MOCK_SESSION_KEY = "liferise_mock_session";
const MOCK_PROFILES_KEY = "liferise_mock_profiles";
const MOCK_PENDING_CONFIRMATIONS_KEY = "liferise_mock_pending_confirmations";
const MOCK_MAGIC_LINKS_KEY = "liferise_mock_magic_links";
const MOCK_OTP_CODES_KEY = "liferise_mock_otp_codes";

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

function getItem<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers(): Record<string, { password: string; user: User; confirmed: boolean }> {
  return getItem(MOCK_USERS_KEY, {});
}

function setUsers(users: Record<string, { password: string; user: User; confirmed: boolean }>) {
  setItem(MOCK_USERS_KEY, users);
}

function getProfiles(): Record<string, MockProfile> {
  return getItem(MOCK_PROFILES_KEY, {});
}

function setProfiles(profiles: Record<string, MockProfile>) {
  setItem(MOCK_PROFILES_KEY, profiles);
}

function getSession(): Session | null {
  return getItem(MOCK_SESSION_KEY, null);
}

function setSession(session: Session | null) {
  setItem(MOCK_SESSION_KEY, session);
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
    phone: (metadata.phone as string) ?? "",
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
    users[email] = { password, user, confirmed: false };
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

    // Store pending confirmation
    const pending = getItem<string[]>(MOCK_PENDING_CONFIRMATIONS_KEY, []);
    if (!pending.includes(email)) {
      pending.push(email);
      setItem(MOCK_PENDING_CONFIRMATIONS_KEY, pending);
    }

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
    if (!record.confirmed) {
      throw { message: "Email not confirmed" };
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
    options?: { redirectTo?: string; scopes?: string };
  }) => {
    await new Promise((r) => setTimeout(r, 800));
    const email = `${provider}-user-` + generateId() + "@example.com";
    const users = getUsers();
    let user: User;
    const existing = Object.values(users).find((u) => u.user.email === email);

    if (existing) {
      user = existing.user;
    } else {
      user = createMockUser(email, {
        full_name: `${provider} User`,
        avatar_url: `https://ui-avatars.com/api/?name=${provider}+User`,
        provider,
      });
      users[email] = { password: "oauth-no-password", user, confirmed: true };
      setUsers(users);

      const profiles = getProfiles();
      profiles[user.id] = {
        id: user.id,
        email,
        first_name: provider,
        last_name: "User",
        phone: "",
        role: "resident",
        approval_status: "approved",
        onboarding_completed: false,
        avatar_url: `https://ui-avatars.com/api/?name=${provider}+User`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfiles(profiles);
    }

    const session = createMockSession(user);
    setSession(session);
    notify("SIGNED_IN", session);

    return {
      data: { url: options?.redirectTo ?? "/resident" },
      error: null,
    };
  },

  signInWithOtp: async ({
    email,
    phone,
    options: _options,
  }: {
    email?: string;
    phone?: string;
    options?: { emailRedirectTo?: string; shouldCreateUser?: boolean };
  }) => {
    await new Promise((r) => setTimeout(r, 600));

    if (email) {
      // Magic link simulation
      const magicLinks = getItem<Record<string, string>>(MOCK_MAGIC_LINKS_KEY, {});
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      magicLinks[email] = code;
      setItem(MOCK_MAGIC_LINKS_KEY, magicLinks);
      console.log(`[MOCK] Magic link sent to ${email}. Code: ${code}`);
      return { data: {}, error: null };
    }

    if (phone) {
      // SMS OTP simulation
      const otpCodes = getItem<Record<string, string>>(MOCK_OTP_CODES_KEY, {});
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      otpCodes[phone] = code;
      setItem(MOCK_OTP_CODES_KEY, otpCodes);
      console.log(`[MOCK] OTP sent to ${phone}. Code: ${code}`);
      return { data: {}, error: null };
    }

    throw { message: "Email or phone required" };
  },

  verifyOtp: async ({
    email,
    phone,
    token,
    type: _type,
  }: {
    email?: string;
    phone?: string;
    token: string;
    type: "email" | "sms" | "signup";
  }) => {
    await new Promise((r) => setTimeout(r, 400));

    if (email) {
      const magicLinks = getItem<Record<string, string>>(MOCK_MAGIC_LINKS_KEY, {});
      if (magicLinks[email] !== token) {
        throw { message: "Invalid token" };
      }
      delete magicLinks[email];
      setItem(MOCK_MAGIC_LINKS_KEY, magicLinks);

      const users = getUsers();
      let record = users[email];
      if (!record) {
        // Create user if not exists (magic link creates user)
        const user = createMockUser(email, {});
        users[email] = { password: "magic-link-no-password", user, confirmed: true };
        setUsers(users);
        record = users[email];

        const profiles = getProfiles();
        profiles[user.id] = {
          id: user.id,
          email,
          first_name: "",
          last_name: "",
          phone: "",
          role: "resident",
          approval_status: "approved",
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfiles(profiles);
      }

      const session = createMockSession(record.user);
      setSession(session);
      notify("SIGNED_IN", session);
      return { data: { user: record.user, session }, error: null };
    }

    if (phone) {
      const otpCodes = getItem<Record<string, string>>(MOCK_OTP_CODES_KEY, {});
      if (otpCodes[phone] !== token) {
        throw { message: "Invalid OTP code" };
      }
      delete otpCodes[phone];
      setItem(MOCK_OTP_CODES_KEY, otpCodes);

      const users = getUsers();
      let record = Object.values(users).find((u) => u.user.phone === phone);
      if (!record) {
        const email = `phone-${phone.replace(/\D/g, "")}@example.com`;
        const user = createMockUser(email, { phone });
        users[email] = { password: "otp-no-password", user, confirmed: true };
        setUsers(users);
        record = users[email];

        const profiles = getProfiles();
        profiles[user.id] = {
          id: user.id,
          email,
          first_name: "",
          last_name: "",
          phone,
          role: "resident",
          approval_status: "approved",
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfiles(profiles);
      }

      const session = createMockSession(record.user);
      setSession(session);
      notify("SIGNED_IN", session);
      return { data: { user: record.user, session }, error: null };
    }

    throw { message: "Email or phone required" };
  },

  resend: async ({
    type,
    email,
  }: {
    type: "signup" | "email_change" | "phone_change" | "recovery" | "email";
    email?: string;
    phone?: string;
  }) => {
    await new Promise((r) => setTimeout(r, 300));
    if (type === "signup" && email) {
      const pending = getItem<string[]>(MOCK_PENDING_CONFIRMATIONS_KEY, []);
      if (!pending.includes(email)) {
        throw { message: "User not found or already confirmed" };
      }
      console.log(`[MOCK] Confirmation email resent to ${email}`);
      return { data: {}, error: null };
    }
    throw { message: "Unsupported resend type" };
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

  resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
    await new Promise((r) => setTimeout(r, 600));
    const users = getUsers();
    if (!users[email]) {
      // Don't leak whether email exists
      return { data: {}, error: null };
    }
    console.log(`[MOCK] Password reset link sent to ${email}. Redirect: ${options?.redirectTo}`);
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

  // Helper for mock mode: simulate email confirmation
  confirmEmail: async (email: string) => {
    const users = getUsers();
    if (users[email]) {
      users[email].confirmed = true;
      setUsers(users);
      // Remove from pending
      const pending = getItem<string[]>(MOCK_PENDING_CONFIRMATIONS_KEY, []);
      setItem(
        MOCK_PENDING_CONFIRMATIONS_KEY,
        pending.filter((e) => e !== email)
      );
    }
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
  const users = getUsers();
  const profiles = getProfiles();

  if (Object.keys(users).length > 0) return; // Already seeded

  const managerUser = createMockUser("manager@liferise.demo", {
    first_name: "Admin",
    last_name: "Manager",
    role: "manager",
  });
  users["manager@liferise.demo"] = { password: "Manager123!", user: managerUser, confirmed: true };
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
  users["vendor@liferise.demo"] = { password: "Vendor123!", user: vendorUser, confirmed: true };
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
  users["pending@liferise.demo"] = { password: "Pending123!", user: pendingVendor, confirmed: true };
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
  users["resident@liferise.demo"] = { password: "Resident123!", user: residentUser, confirmed: true };
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
