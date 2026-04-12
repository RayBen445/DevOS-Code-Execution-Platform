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

export interface UploadOptions {
  /** Optional upload progress callback 0–100. Only supported for Firebase fallback. */
  onProgress?: (pct: number) => void;
}

/**
 * Upload a file and return its public URL.
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
  if (isSupabaseReady && supabase) {
    return uploadToSupabase(file, path);
  }
  return uploadToFirebase(file, path, opts);
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
  return data.publicUrl;
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
