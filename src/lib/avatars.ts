/** Default avatar shown for any user without a profile picture. */
export const DEFAULT_USER_AVATAR =
  "https://image2url.com/r2/default/images/1775075023408-9e730ea7-c5a2-43e5-90e2-e83c16620aeb.jpeg";

/**
 * Official DevOS / system avatar.
 * Used for admin posts, official templates, and system content.
 */
export const SYSTEM_AVATAR =
  "https://image2url.com/r2/default/images/1775049565777-edb4a68b-6591-4227-80b7-53b5e322c58b.png";

/** Returns the user's avatar URL, falling back to the default. */
export function resolveAvatar(url?: string | null): string {
  return url?.trim() || DEFAULT_USER_AVATAR;
}

/** Maximum avatar file size in bytes (2 MB). */
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const CLOUDINARY_CLOUD = "dkvqc4qod";
const CLOUDINARY_PRESET = "devos_avatars";

/**
 * Uploads an avatar image file to Cloudinary.
 * Uses an unsigned upload preset — no API secret is exposed.
 * Returns the secure_url of the uploaded image.
 */
export async function uploadAvatarToCloudinary(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only images are allowed (jpg, png, webp).");
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error("Image must be smaller than 2 MB.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  formData.append("folder", "devos/avatars");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    throw new Error(`Cloudinary upload failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.secure_url) {
    throw new Error("Upload failed: no secure_url returned.");
  }

  return data.secure_url as string;
}
