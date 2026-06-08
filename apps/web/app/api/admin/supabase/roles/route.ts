/**
 * GET /api/admin/supabase/roles
 *
 * Returns a static list of roles derived from the `profiles.role` enum.
 * Supabase does not have a dedicated roles table, so we mirror the
 * 4-tier portal architecture with derived level metadata.
 */

import { NextRequest, NextResponse } from 'next/server';

interface Role {
  id: number;
  name: string;
  slug: string;
  level: number;
  description: string;
}

interface PaginatedResponse<T> {
  data: T[];
  links: Record<string, never>;
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

const ROLES: Role[] = [
  {
    id: 1,
    name: 'Super Admin',
    slug: 'admin',
    level: 100,
    description: 'Full platform access across all modules.',
  },
  {
    id: 2,
    name: 'Manager',
    slug: 'manager',
    level: 70,
    description: 'Property and vendor management.',
  },
  {
    id: 3,
    name: 'Vendor',
    slug: 'vendor',
    level: 30,
    description: 'Service provider portal access.',
  },
  {
    id: 4,
    name: 'Resident',
    slug: 'resident',
    level: 10,
    description: 'End-user customer portal access.',
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') ?? '').toLowerCase();

  const filtered = search
    ? ROLES.filter(
        (r) => r.name.toLowerCase().includes(search) || r.slug.toLowerCase().includes(search)
      )
    : ROLES;

  const response: PaginatedResponse<Role> = {
    data: filtered,
    links: {},
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      path: req.url.split('?')[0],
      per_page: filtered.length,
      to: filtered.length,
      total: filtered.length,
    },
  };

  return NextResponse.json({ status: true, data: response, message: '' });
}
