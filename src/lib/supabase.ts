import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for image/file storage.
 *
 * Required environment variables (Vite style):
 *   VITE_SUPABASE_URL       — your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — your Supabase anon/public API key
 *
 * If these are not set the client is null and storageService falls back to
 * Firebase Storage automatically.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** True if Supabase is configured and available for storage. */
export const isSupabaseReady = supabase !== null;

/** The default storage bucket name. Override via VITE_SUPABASE_BUCKET. */
export const STORAGE_BUCKET =
  (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) ?? "devos-media";
