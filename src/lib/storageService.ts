/**
 * storageService.ts
 *
 * Unified image / file upload.
 *
 * Strategy:
 *   1. If Supabase Storage is configured → upload there, return public URL
 *   2. Otherwise fall back to Firebase Storage
 *
 * All callers just do:
 *   const url = await uploadImage(file, path);
 */

import { supabase, isSupabaseReady, STORAGE_BUCKET } from "./supabase";
import { storage } from "./firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  StorageError,
} from "firebase/storage";

import imageCompression from "browser-image-compression";

export interface UploadOptions {
  /** Optional upload progress callback 0–100. Only supported for Firebase fallback. */
  onProgress?: (pct: number) => void;
  /** Skip image compression if true. */
  skipCompression?: boolean;
}

/**
 * Upload a file and return its public URL.
 * Image files are automatically compressed on the client before upload.
 *
 * @param file   The File or Blob to upload.
 * @param path   Storage path, e.g. "avatars/uid/filename.jpg"
 * @param opts   Upload options (progress callback, etc.)
 */
export async function uploadImage(
  file: File | Blob,
  path: string,
  opts: UploadOptions = {}
): Promise<string> {
  let finalFile = file;

  // Compress image if it's an image file and compression is not skipped
  if (!opts.skipCompression && file.type.startsWith("image/") && file instanceof File) {
    try {
      const options = {
        maxSizeMB: 1, // Max 1MB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      finalFile = await imageCompression(file, options);
      console.log(`Compressed image from ${(file.size / 1024).toFixed(2)}KB to ${(finalFile.size / 1024).toFixed(2)}KB`);
    } catch (err) {
      console.warn("Image compression failed, using original file:", err);
    }
  }

  if (isSupabaseReady && supabase) {
    try {
      return await uploadToSupabase(finalFile, path);
    } catch (supabaseErr) {
      // Supabase RLS or network error — fall back to Firebase Storage automatically.
      console.warn("[storageService] Supabase upload failed, falling back to Firebase Storage:", supabaseErr);
    }
  }
  return uploadToFirebase(finalFile, path, opts);
}

// ── Supabase ─────────────────────────────────────────────────────────────────

async function uploadToSupabase(file: File | Blob, path: string): Promise<string> {
  if (!supabase) throw new Error("Supabase client not initialised");

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file instanceof File ? file.type : undefined,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  // Verify the URL is actually reachable (catches private-bucket misconfigurations
  // that return a URL without error but produce a 4xx when fetched).
  try {
    const probe = await fetch(publicUrl, { method: "HEAD", cache: "no-store" });
    if (!probe.ok) {
      throw new Error(`Supabase returned an inaccessible URL (HTTP ${probe.status})`);
    }
  } catch (probeErr: any) {
    // If the probe itself throws (e.g. CORS / network), surface a clear message.
    throw new Error(`Supabase storage URL is not publicly accessible: ${probeErr?.message ?? probeErr}`);
  }

  return publicUrl;
}

// ── Firebase Storage ──────────────────────────────────────────────────────────

function uploadToFirebase(
  file: File | Blob,
  path: string,
  opts: UploadOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => {
        if (opts.onProgress) {
          opts.onProgress((snap.bytesTransferred / snap.totalBytes) * 100);
        }
      },
      (err: StorageError) => reject(new Error(err.message)),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/** Generate a unique storage path for a user avatar image. */
export function avatarPath(uid: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  return `users/${uid}/avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

/** Generate a unique storage path for a user profile banner. */
export function userBannerPath(uid: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  return `users/${uid}/banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

/** Generate a unique storage path for an event banner. */
export function eventBannerPath(eventId: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  return `events/${eventId}/banner-${Date.now()}.${ext}`;
}

/** Generate a unique storage path for a community avatar image. */
export function communityAvatarPath(communityId: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  return `communities/${communityId}/avatar-${Date.now()}.${ext}`;
}

/** Generate a unique storage path for a community banner image. */
export function communityBannerPath(communityId: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  return `communities/${communityId}/banner-${Date.now()}.${ext}`;
}

/** Generate a unique storage path for an organisation avatar image. */
export function orgAvatarPath(orgId: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  return `orgs/${orgId}/avatar-${Date.now()}.${ext}`;
}

/** Generate a unique storage path for a template preview image. */
export function templatePreviewPath(templateId: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  return `templates/${templateId}/preview-${Date.now()}.${ext}`;
}
