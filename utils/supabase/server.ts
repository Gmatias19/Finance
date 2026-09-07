// @ts-nocheck
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzcakiubnjlqvncemlrk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ty7Hwz-VI6nstKEVy7mSuw_aZRwkT_d';

export const createClient = (cookieStore?: any) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll?.() || [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore?.set?.(name, value, options));
          } catch {
            // Server component fallback
          }
        },
      },
    },
  );
};
