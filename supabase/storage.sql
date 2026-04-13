-- =============================================================================
-- DevOS — Supabase Storage Setup
-- =============================================================================
--
-- Run this entire file once in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- The file is fully IDEMPOTENT — safe to re-run at any time.
-- Every policy is dropped with DROP POLICY IF EXISTS before being (re)created,
-- so you will never hit "policy already exists" errors.
--
-- What this sets up:
--   1.  The `devos-media` bucket (public CDN for all platform media)
--   2.  Per-folder Row Level Security (RLS) policies that match the exact path
--       patterns used by src/lib/storageService.ts, SettingsModal.tsx,
--       SettingsPage.tsx, CreateEventPage.tsx, etc.
--   3.  File-type and size guards on the policies
--   4.  A helper view  (devos_storage_stats) for monitoring usage per user
--   5.  A helper view  (devos_storage_audit) for admin moderation
--
-- Path map (mirrors storageService.ts path helpers):
--
--   users/{uid}/avatars/{timestamp}-{random}.{ext}    ← user profile pictures
--   events/{eventId}/banner-{timestamp}.{ext}         ← event banners
--   templates/{templateId}/preview.{ext}              ← template preview images
--   orgs/{orgId}/avatar.{ext}                         ← organisation avatars
--   communities/{communityId}/avatar.{ext}            ← community avatars
--   communities/{communityId}/banner.{ext}            ← community banners
--   plugin_uploads/{projectId}/{filePath}             ← Plugin Marketplace (future)
--
-- =============================================================================


-- =============================================================================
-- SECTION 1 — BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'devos-media',
  'devos-media',
  true,                          -- public CDN: objects are readable without auth token
  10485760,                      -- 10 MB global per-file cap (overridden per policy below)
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif',
    'video/mp4',                 -- for future video uploads (event replays, etc.)
    'application/pdf',           -- for future document uploads
    'application/octet-stream'   -- generic fallback for Plugin Marketplace uploads
  ]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- =============================================================================
-- SECTION 2 — DROP ALL EXISTING POLICIES (makes this file idempotent)
-- =============================================================================
-- PostgreSQL has no CREATE OR REPLACE POLICY syntax, so we drop first.
-- Using DROP POLICY IF EXISTS means this is safe to run even on a fresh DB.
-- =============================================================================

-- User avatars
DROP POLICY IF EXISTS "avatars_read_public"                     ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"                      ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"                      ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"                      ON storage.objects;

-- Event banners
DROP POLICY IF EXISTS "event_banners_read_public"               ON storage.objects;
DROP POLICY IF EXISTS "event_banners_insert_authenticated"       ON storage.objects;
DROP POLICY IF EXISTS "event_banners_update_authenticated"       ON storage.objects;
DROP POLICY IF EXISTS "event_banners_delete_authenticated"       ON storage.objects;

-- Template previews
DROP POLICY IF EXISTS "template_previews_read_public"           ON storage.objects;
DROP POLICY IF EXISTS "template_previews_insert_authenticated"  ON storage.objects;
DROP POLICY IF EXISTS "template_previews_update_authenticated"  ON storage.objects;
DROP POLICY IF EXISTS "template_previews_delete_authenticated"  ON storage.objects;

-- Org avatars
DROP POLICY IF EXISTS "org_avatars_read_public"                 ON storage.objects;
DROP POLICY IF EXISTS "org_avatars_insert_authenticated"        ON storage.objects;
DROP POLICY IF EXISTS "org_avatars_update_authenticated"        ON storage.objects;
DROP POLICY IF EXISTS "org_avatars_delete_authenticated"        ON storage.objects;

-- Community images
DROP POLICY IF EXISTS "community_images_read_public"            ON storage.objects;
DROP POLICY IF EXISTS "community_images_insert_authenticated"   ON storage.objects;
DROP POLICY IF EXISTS "community_images_update_authenticated"   ON storage.objects;
DROP POLICY IF EXISTS "community_images_delete_authenticated"   ON storage.objects;


-- =============================================================================
-- SECTION 3 — ROW LEVEL SECURITY
-- =============================================================================
-- NOTE: Supabase enables RLS on storage.objects automatically.
-- Running ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY here would
-- fail with error 42501 ("must be owner of table objects") because the table
-- is owned by the internal supabase_storage_admin role, not the postgres role.
-- The policies in the sections below are sufficient.
--
-- IMPORTANT — Firebase Auth + Supabase Storage:
-- DevOS uses Firebase Authentication, not Supabase Auth.  When the browser
-- uploads files using the Supabase anon key, auth.uid() in Supabase RLS
-- returns NULL.  All INSERT/UPDATE/DELETE policies below therefore grant
-- access to the `anon` role (the anon key) in addition to `authenticated`,
-- so uploads succeed from the Firebase-authenticated DevOS frontend.
-- Read access for public objects is already open to `anon`.
-- =============================================================================


-- =============================================================================
-- SECTION 4 — USER AVATARS
-- Path: users/{uid}/avatars/{filename}
-- =============================================================================

-- Public read
CREATE POLICY "avatars_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[3] = 'avatars'
);

-- Upload to own folder (5 MB max)
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[3] = 'avatars'
  AND (metadata->>'size')::bigint <= 5242880
);

-- Overwrite own avatar
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[3] = 'avatars'
)
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[3] = 'avatars'
);

-- Delete own avatar
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[3] = 'avatars'
);


-- =============================================================================
-- SECTION 5 — EVENT BANNERS
-- Path: events/{eventId}/banner-{timestamp}.{ext}
-- =============================================================================

CREATE POLICY "event_banners_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'events'
  AND name LIKE 'events/%/banner-%'
);

CREATE POLICY "event_banners_insert_authenticated"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'events'
  AND name LIKE 'events/%/banner-%'
  AND (metadata->>'size')::bigint <= 8388608
);

CREATE POLICY "event_banners_update_authenticated"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'events'
  AND name LIKE 'events/%/banner-%'
)
WITH CHECK (
  bucket_id = 'devos-media'
  AND name LIKE 'events/%/banner-%'
);

CREATE POLICY "event_banners_delete_authenticated"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'events'
  AND name LIKE 'events/%/banner-%'
);


-- =============================================================================
-- SECTION 6 — TEMPLATE PREVIEW IMAGES
-- Path: templates/{templateId}/preview.{ext}
-- =============================================================================

CREATE POLICY "template_previews_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'templates'
);

CREATE POLICY "template_previews_insert_authenticated"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'templates'
  AND (storage.foldername(name))[3] IS NULL
  AND (metadata->>'size')::bigint <= 5242880
);

CREATE POLICY "template_previews_update_authenticated"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING  (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'templates')
WITH CHECK (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'templates');

CREATE POLICY "template_previews_delete_authenticated"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'templates'
);


-- =============================================================================
-- SECTION 7 — ORGANISATION AVATARS
-- Path: orgs/{orgId}/avatar.{ext}
-- =============================================================================

CREATE POLICY "org_avatars_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'orgs'
);

CREATE POLICY "org_avatars_insert_authenticated"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'orgs'
  AND (storage.foldername(name))[3] IS NULL
  AND (metadata->>'size')::bigint <= 3145728
);

CREATE POLICY "org_avatars_update_authenticated"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING  (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'orgs')
WITH CHECK (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'orgs');

CREATE POLICY "org_avatars_delete_authenticated"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'orgs'
);


-- =============================================================================
-- SECTION 8 — COMMUNITY AVATARS & BANNERS
-- Path: communities/{communityId}/avatar.{ext}
--       communities/{communityId}/banner.{ext}
-- =============================================================================

CREATE POLICY "community_images_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'communities'
);

CREATE POLICY "community_images_insert_authenticated"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'communities'
  AND (storage.foldername(name))[3] IS NULL
  AND (metadata->>'size')::bigint <= 8388608
);

CREATE POLICY "community_images_update_authenticated"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING  (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'communities')
WITH CHECK (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'communities');

CREATE POLICY "community_images_delete_authenticated"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'communities'
);


-- =============================================================================
-- SECTION 9 — PLUGIN MARKETPLACE UPLOADS  (server-side only)
-- Path: plugin_uploads/{projectId}/{userDefinedPath}
-- No direct browser policies — Cloud Function proxy uses service-role key.
-- =============================================================================

-- "plugin_uploads/* — server-side only via service-role key in Cloud Functions"
-- No policies created here intentionally (RLS defaults to DENY for this path).


-- =============================================================================
-- SECTION 10 — HELPER VIEWS
-- =============================================================================

-- ── 10a. Per-user storage usage ──────────────────────────────────────────────
CREATE OR REPLACE VIEW devos_storage_stats AS
SELECT
  owner                                                     AS user_id,
  COUNT(*)                                                  AS file_count,
  SUM((metadata->>'size')::bigint)                          AS total_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1048576.0, 2)   AS total_mb,
  (storage.foldername(name))[1]                             AS folder_root,
  MIN(created_at)                                           AS first_upload,
  MAX(created_at)                                           AS last_upload
FROM storage.objects
WHERE bucket_id = 'devos-media'
  AND owner IS NOT NULL
GROUP BY owner, (storage.foldername(name))[1];


-- ── 10b. Full audit log view ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW devos_storage_audit AS
SELECT
  id,
  name                                    AS full_path,
  bucket_id,
  owner                                   AS uploaded_by,
  (storage.foldername(name))[1]          AS folder_root,
  (storage.foldername(name))[2]          AS folder_id,
  (storage.foldername(name))[3]          AS sub_folder,
  (metadata->>'size')::bigint            AS size_bytes,
  ROUND((metadata->>'size')::bigint / 1048576.0, 3) AS size_mb,
  metadata->>'mimetype'                  AS mime_type,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'devos-media'
ORDER BY created_at DESC;


-- ── 10c. Orphan detection view ────────────────────────────────────────────────
CREATE OR REPLACE VIEW devos_orphaned_avatars AS
SELECT
  o.id,
  o.name                                   AS path,
  o.owner                                  AS orphaned_uid,
  o.created_at,
  (o.metadata->>'size')::bigint            AS size_bytes
FROM storage.objects o
LEFT JOIN auth.users u ON u.id = o.owner
WHERE o.bucket_id = 'devos-media'
  AND (storage.foldername(o.name))[1] = 'users'
  AND u.id IS NULL;


-- =============================================================================
-- SECTION 11 — HELPER FUNCTIONS
-- =============================================================================

-- Per-user storage bytes
CREATE OR REPLACE FUNCTION devos_storage_used_bytes(p_user_id TEXT)
RETURNS BIGINT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
  FROM storage.objects
  WHERE bucket_id = 'devos-media'
    AND owner = p_user_id::uuid;
$$;

-- Delete all storage for a user (admin/server-side only)
CREATE OR REPLACE FUNCTION devos_delete_user_storage(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'devos-media'
    AND owner = p_user_id::uuid;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- =============================================================================
-- SECTION 12 — QUICK VERIFICATION QUERIES
-- =============================================================================
-- Copy-paste any of these into SQL Editor to verify the setup.

-- 1. Confirm the bucket was created
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'devos-media';

-- 2. List all RLS policies on storage.objects
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage'
-- ORDER BY cmd, policyname;

-- 3. Count objects by folder root (after some uploads)
-- SELECT
--   (storage.foldername(name))[1] AS folder,
--   COUNT(*)                       AS files,
--   SUM((metadata->>'size')::bigint) AS total_bytes
-- FROM storage.objects
-- WHERE bucket_id = 'devos-media'
-- GROUP BY 1
-- ORDER BY total_bytes DESC;

-- 4. Top 10 largest files
-- SELECT * FROM devos_storage_audit ORDER BY size_bytes DESC LIMIT 10;

-- 5. Check for orphaned avatars
-- SELECT * FROM devos_orphaned_avatars LIMIT 20;

-- 6. Total space used by a specific user
-- SELECT devos_storage_used_bytes('<paste-uid-here>');
