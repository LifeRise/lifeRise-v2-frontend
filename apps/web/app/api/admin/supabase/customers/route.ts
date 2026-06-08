/**
 * GET /api/admin/supabase/customers
 *
 * Server-side proxy that lists resident customers from the
 * Supabase `profiles` table using the service-role key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

interface ProfileRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  approval_status: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  links: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
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

export async function GET(req: NextRequest) {
  if (!supabaseUrl) {
    return NextResponse.json(
      {
        error:
          'Supabase URL is not configured. Add NEXT_PUBLIC_SUPABASE_URL to apps/web/.env.local',
      },
      { status: 503 }
    );
  }
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          'Supabase service role key is not configured. Add SUPABASE_SERVICE_ROLE_KEY to apps/web/.env.local',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '15', 10)));
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = admin.from('profiles').select('*', { count: 'exact' }).eq('role', 'resident');

  if (status) {
    query = query.eq('approval_status', status);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[api/admin/supabase/customers] Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const rows = (data as ProfileRow[] | null) ?? [];

  const response: PaginatedResponse<unknown> = {
    data: rows.map((row) => ({
      id: row.id,
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      email: row.email,
      phone: row.phone ?? '',
      status: row.approval_status,
      last_login_at: null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    links: {
      first: page > 1 ? buildUrl(req, 1, perPage) : undefined,
      last: page < lastPage ? buildUrl(req, lastPage, perPage) : undefined,
      prev: page > 1 ? buildUrl(req, page - 1, perPage) : undefined,
      next: page < lastPage ? buildUrl(req, page + 1, perPage) : undefined,
    },
    meta: {
      current_page: page,
      from: total === 0 ? 0 : from + 1,
      last_page: lastPage,
      path: req.url.split('?')[0],
      per_page: perPage,
      to: Math.min(from + perPage, total),
      total,
    },
  };

  return NextResponse.json({ status: true, data: response, message: '' });
}

function buildUrl(req: NextRequest, page: number, perPage: number): string {
  const url = new URL(req.url);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  return url.toString();
}
