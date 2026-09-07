// @ts-nocheck
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzcakiubnjlqvncemlrk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ty7Hwz-VI6nstKEVy7mSuw_aZRwkT_d';

export const createClient = (request: any) => {
  let response = {
    headers: new Headers(),
    cookies: {
      set: () => {},
    },
  };

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request?.cookies?.getAll?.() || [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request?.cookies?.set?.(name, value));
        },
      },
    },
  );

  return { response, supabase };
};
