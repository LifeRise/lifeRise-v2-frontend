import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Best-effort redirect from user_metadata. The Go backend bridge in
      // hooks.ts (onAuthStateChange / init) will correct the role once the
      // backend JWT is issued, so AuthProvider will re-route if needed.
      const role = data.session.user.user_metadata?.role as string | undefined;
      const dest =
        role === 'admin'
          ? '/admin'
          : role === 'manager'
            ? '/manager'
            : role === 'vendor'
              ? '/vendor'
              : '/resident';

      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
