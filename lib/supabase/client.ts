import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Fail fast with a clear message: missing client-side env vars will cause
    // Supabase requests to be unauthenticated and return "No API key found".
    // Throwing here surfaces the problem during development instead of failing silently.
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n" +
        "Add them to .env.local (use the project URL and the public/anon key from Supabase)."
    );
  }
  return createBrowserClient(url, key);
}
