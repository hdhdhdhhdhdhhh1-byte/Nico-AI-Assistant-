import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createMockSupabaseClient() {
  const mockQuery: any = {
    select: () => mockQuery,
    insert: () => mockQuery,
    update: () => mockQuery,
    upsert: () => mockQuery,
    delete: () => mockQuery,
    eq: () => mockQuery,
    neq: () => mockQuery,
    order: () => mockQuery,
    limit: () => mockQuery,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({
        data: null,
        error: new Error("Supabase credentials not configured"),
      }),
      signUp: async () => ({ data: null, error: new Error("Supabase credentials not configured") }),
      signOut: async () => ({ error: null }),
    },
    from: () => mockQuery,
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
  } as unknown as ReturnType<typeof createClient<Database>>;
}

function isValidHttpUrl(stringUrl?: string): boolean {
  if (!stringUrl || typeof stringUrl !== "string") return false;
  try {
    const url = new URL(stringUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createSupabaseClient() {
  const SUPABASE_URL =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!isValidHttpUrl(SUPABASE_URL) || !SUPABASE_PUBLISHABLE_KEY) {
    console.warn(
      "[Supabase] Missing or invalid Supabase environment variables. Running in Guest/Demo mode.",
    );
    return createMockSupabaseClient();
  }

  try {
    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      },
      auth: {
        storage: typeof window !== "undefined" ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn(
      "[Supabase] Failed to initialize Supabase client. Running in Guest/Demo mode.",
      err,
    );
    return createMockSupabaseClient();
  }
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
