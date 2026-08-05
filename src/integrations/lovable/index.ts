/**
 * Backwards-compatible auth shim.
 *
 * Originally proxied to @lovable.dev/cloud-auth-js. After the Phase 11
 * independence migration this file delegates straight to Supabase Auth so
 * the project has no Lovable runtime dependency. The `lovable.auth` name is
 * kept only so existing call sites (e.g. src/routes/auth.tsx) keep working.
 */

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type SignInResult = {
  redirected: boolean;
  error?: Error;
};

type OAuthProvider = "google" | "apple" | "azure" | "github";

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: OAuthProvider | string,
      opts?: SignInOptions,
    ): Promise<SignInResult> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as OAuthProvider,
        options: {
          redirectTo: opts?.redirect_uri,
          queryParams: opts?.extraParams,
        },
      });
      if (error) return { redirected: false, error };
      // Supabase's OAuth flow redirects the browser to the provider.
      return { redirected: true };
    },
  },
};
