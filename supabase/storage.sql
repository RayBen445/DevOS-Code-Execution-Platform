-- =============================================================================
-- DevOS — Supabase Storage Setup
-- =============================================================================
--
-- Run this entire file once in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
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
-- SECTION 2 — ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 3 — USER AVATARS
-- Path: users/{uid}/avatars/{filename}
--
-- avatarPath() in storageService.ts produces:
--   `users/${uid}/avatars/${Date.now()}-${random}.${ext}`
--
-- Rules:
--   SELECT  — anyone (public CDN)
--   INSERT  — authenticated user, only inside their own users/{uid}/ folder
--   UPDATE  — same user (upsert: true in uploadToSupabase)
--   DELETE  — same user
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

-- Authenticated user can upload to their own folder (5 MB max for avatars)
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND (storage.foldername(name))[3] = 'avatars'
  AND (metadata->>'size')::bigint <= 5242880
);

-- Authenticated user can update (overwrite) their own avatar
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND (storage.foldername(name))[3] = 'avatars'
)
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Authenticated user can delete their own avatar
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND (storage.foldername(name))[3] = 'avatars'
);


-- =============================================================================
-- SECTION 4 — EVENT BANNERS
-- Path: events/{eventId}/banner-{timestamp}.{ext}
--
-- eventBannerPath() in storageService.ts produces:
--   `events/${eventId}/banner-${Date.now()}.${ext}`
--
-- Rules:
--   SELECT  — anyone
--   INSERT  — any authenticated user (event creator uploads from CreateEventPage)
--   UPDATE  — any authenticated user (event creator may re-upload before publish)
--   DELETE  — any authenticated user
--
-- Note: tighter creator-only enforcement requires joining with Firestore data,
-- which Supabase Storage RLS cannot do directly. The app layer in
-- CreateEventPage.tsx already guards the upload behind an auth check.
-- =============================================================================

-- Public read
CREATE POLICY "event_banners_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'events'
  AND name LIKE 'events/%/banner-%'
);

-- Any signed-in user can upload a banner (8 MB max for banners)
CREATE POLICY "event_banners_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'events'
  AND name LIKE 'events/%/banner-%'
  AND (metadata->>'size')::bigint <= 8388608
);

-- Any signed-in user can overwrite a banner
CREATE POLICY "event_banners_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'events'
  AND name LIKE 'events/%/banner-%'
)
WITH CHECK (
  bucket_id = 'devos-media'
  AND name LIKE 'events/%/banner-%'
);

-- Any signed-in user can delete (app layer enforces creator check)
CREATE POLICY "event_banners_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'events'
  AND name LIKE 'events/%/banner-%'
);


-- =============================================================================
-- SECTION 5 — TEMPLATE PREVIEW IMAGES
-- Path: templates/{templateId}/preview.{ext}
--
-- The Template type has `previewImageUrl?: string` (types.ts:162).
-- No storageService.ts helper exists yet — add
-- `templatePreviewPath(templateId, file)` when building the upload UI.
--
-- Rules:
--   SELECT  — anyone (templates are public)
--   INSERT  — any authenticated user (app layer verifies they own the template)
--   UPDATE  — same
--   DELETE  — same
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
TO authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'templates'
  AND (storage.foldername(name))[3] IS NULL    -- templates/{id}/filename only, not deeper
  AND (metadata->>'size')::bigint <= 5242880   -- 5 MB max
);

CREATE POLICY "template_previews_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING  (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'templates')
WITH CHECK (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'templates');

CREATE POLICY "template_previews_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'templates'
);


-- =============================================================================
-- SECTION 6 — ORGANISATION AVATARS
-- Path: orgs/{orgId}/avatar.{ext}
--
-- The Organization type has `avatar?: string` (types.ts:375).
--
-- Rules:
--   SELECT  — anyone
--   INSERT/UPDATE — authenticated user (app layer checks org owner/admin role)
--   DELETE  — authenticated user
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
TO authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'orgs'
  AND (storage.foldername(name))[3] IS NULL    -- orgs/{id}/file only, no deeper nesting
  AND (metadata->>'size')::bigint <= 3145728   -- 3 MB max for org avatars
);

CREATE POLICY "org_avatars_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING  (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'orgs')
WITH CHECK (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'orgs');

CREATE POLICY "org_avatars_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'orgs'
);


-- =============================================================================
-- SECTION 7 — COMMUNITY AVATARS & BANNERS
-- Path: communities/{communityId}/avatar.{ext}
--       communities/{communityId}/banner.{ext}
--
-- The Community type has `avatar?: string` and `banner?: string` (types.ts:427-428).
--
-- Rules:
--   SELECT  — anyone
--   INSERT/UPDATE — authenticated user (app layer checks community admin role)
--   DELETE  — authenticated user
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
TO authenticated
WITH CHECK (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'communities'
  AND (storage.foldername(name))[3] IS NULL    -- communities/{id}/file only
  AND (metadata->>'size')::bigint <= 8388608   -- 8 MB max (banners can be larger)
);

CREATE POLICY "community_images_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING  (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'communities')
WITH CHECK (bucket_id = 'devos-media' AND (storage.foldername(name))[1] = 'communities');

CREATE POLICY "community_images_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'devos-media'
  AND (storage.foldername(name))[1] = 'communities'
);


-- =============================================================================
-- SECTION 8 — PLUGIN MARKETPLACE UPLOADS  (future)
-- Path: plugin_uploads/{projectId}/{userDefinedPath}
--
-- These are files uploaded by end-users of developer apps via the
-- DevOS Storage plugin (see devos-plugin-marketplace.md, Section 3).
-- All access goes through a Cloud Function proxy that uses the service-role
-- key — the browser SDK never touches this path directly.
-- RLS denies direct client access; the proxy bypasses RLS via the Admin SDK.
-- =============================================================================

-- No direct browser SELECT — proxy issues signed URLs instead.
-- Achieved by NOT creating a SELECT policy for plugin_uploads, so RLS
-- defaults to DENY for any request whose path starts with plugin_uploads/.

-- No INSERT/UPDATE/DELETE policies for plugin_uploads/ either.
-- The Cloud Function proxy holds the service-role key and bypasses RLS.

-- Placeholder comment so the intent is clear in a policy audit:
-- "plugin_uploads/* — server-side only via service-role key in Cloud Functions"


-- =============================================================================
-- SECTION 9 — HELPER VIEWS
-- =============================================================================

-- ── 9a. Per-user storage usage ───────────────────────────────────────────────
-- Shows how much space each auth.uid() is consuming, broken down by folder.
-- Useful in AdminDashboard.tsx and a future "Storage quota" settings panel.
--
-- Usage:
--   SELECT * FROM devos_storage_stats ORDER BY total_bytes DESC;

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


-- ── 9b. Full audit log view ───────────────────────────────────────────────────
-- Every object with resolved path segments for admin review.
-- Useful for flagging large files, unexpected paths, or abuse.
--
-- Usage:
--   SELECT * FROM devos_storage_audit
--   WHERE folder_root = 'users'
--   ORDER BY size_bytes DESC
--   LIMIT 50;

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


-- ── 9c. Orphan detection view ─────────────────────────────────────────────────
-- Files in users/ whose owner no longer exists in auth.users (deleted accounts).
-- Run periodically to reclaim space.
--
-- Usage:
--   SELECT * FROM devos_orphaned_avatars;
--   -- then clean up:
--   DELETE FROM storage.objects WHERE id IN (SELECT id FROM devos_orphaned_avatars);

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
-- SECTION 10 — HELPER FUNCTION: per-user storage bytes
-- =============================================================================
-- Returns the total bytes stored for a given user_id.
-- Use this in the app to power a "storage used / limit" progress bar.
--
-- Usage:
--   SELECT devos_storage_used_bytes('some-auth-uid');

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


-- =============================================================================
-- SECTION 11 — CLEANUP FUNCTION (service-role / admin use only)
-- =============================================================================
-- Deletes ALL storage objects for a given user (e.g. on account deletion).
-- Call this from a Cloud Function with the service-role key — never from
-- the browser client.
--
-- Usage:
--   SELECT devos_delete_user_storage('uid-of-deleted-user');
--   -- returns the number of rows deleted

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
