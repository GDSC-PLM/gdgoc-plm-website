import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { HypeSnapshot } from "@/features/hype/types";

type HypeDatabase = {
  public: {
    Tables: {
      hype_counter: {
        Row: { id: boolean; count: number };
        Insert: { id?: boolean; count?: number };
        Update: { count?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_hype: {
        Args: { p_browser_id: string };
        Returns: number;
      };
      get_hype_snapshot: {
        Args: { p_stream_id: string };
        Returns: HypeSnapshot;
      };
      increment_hype_batch: {
        Args: { p_browser_id: string; p_stream_id: string; p_through: number };
        Returns: HypeSnapshot;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export function createHypeClient(): SupabaseClient<HypeDatabase> {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Counter temporarily unavailable");
  }

  return createClient<HypeDatabase>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: {
      timeout: 5_000,
      retry: false,
    },
    global: {
      fetch: (input, init) => {
        const timeout = AbortSignal.timeout(5_000);
        return fetch(input, {
          ...init,
          cache: "no-store",
          signal: init?.signal
            ? AbortSignal.any([init.signal, timeout])
            : timeout,
        });
      },
    },
  });
}
