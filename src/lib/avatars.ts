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
