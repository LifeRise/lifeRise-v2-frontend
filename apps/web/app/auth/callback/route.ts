import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Determine redirect based on user role metadata if available
      const role = data.session.user.user_metadata?.role as string | undefined;
      const dest = role === 'manager' ? '/manager' : role === 'vendor' ? '/vendor' : '/resident';

      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
