/**
 * Role-Based Access Control (RBAC) for DevOS organizations.
 *
 * Roles (highest → lowest privilege):
 *   owner      – full control; created automatically for org creator
 *   admin      – manage members + all project actions
 *   developer  – create/run/preview/deploy projects; cannot manage members
 *   viewer     – view projects only
 *
 * Legacy roles ("member", "moderator") are mapped to developer and admin
 * respectively for backward compatibility.
 */

import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { OrgMemberRole, OrgPermission } from "../types";

// ---------------------------------------------------------------------------
// Permission matrix
// ---------------------------------------------------------------------------

type PermissionMatrix = Record<OrgPermission, Set<OrgMemberRole>>;

const ALLOWED_ROLES: PermissionMatrix = {
  create_project: new Set(["owner", "admin", "developer", "moderator", "member"]),
  deploy_project: new Set(["owner", "admin", "developer", "moderator", "member"]),
  run_project: new Set(["owner", "admin", "developer", "moderator", "member"]),
  preview_project: new Set(["owner", "admin", "developer", "viewer", "moderator", "member"]),
  update_project: new Set(["owner", "admin", "developer", "moderator", "member"]),
  delete_project: new Set(["owner", "admin", "moderator"]),
  manage_members: new Set(["owner", "admin", "moderator"]),
  view_project: new Set(["owner", "admin", "developer", "viewer", "moderator", "member"]),
};

/**
 * Check whether a role has a given permission.
 * This is a synchronous check — use when you already know the role.
 */
export function roleHasPermission(role: OrgMemberRole, permission: OrgPermission): boolean {
  return ALLOWED_ROLES[permission].has(role);
}

/**
 * Fetch the user's role in an org from Firestore and check permission.
 * Returns `true` if the user is allowed, `false` otherwise (including when
 * the user is not a member of the org).
 *
 * @param userId   - Firebase Auth UID
 * @param orgId    - Organization document ID
 * @param permission - Action to check
 */
export async function checkPermission(
  userId: string,
  orgId: string,
  permission: OrgPermission
): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "organizations", orgId, "members", userId));
    if (!snap.exists()) return false;
    const role = snap.data().role as OrgMemberRole;
    return roleHasPermission(role, permission);
  } catch {
    return false;
  }
}

/**
 * Synchronous permission check from a pre-loaded role value.
 * Handy inside React components where the role is already in state.
 */
export function canPerform(
  role: OrgMemberRole | null | undefined,
  permission: OrgPermission
): boolean {
  if (!role) return false;
  return roleHasPermission(role, permission);
}

/**
 * Human-readable label for each role.
 */
export const ROLE_LABELS: Record<OrgMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer",
  // legacy
  member: "Member",
  moderator: "Moderator",
};

/**
 * Badge colour class (Tailwind) for each role.
 */
export const ROLE_COLORS: Record<OrgMemberRole, string> = {
  owner: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  developer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  viewer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  // legacy
  member: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  moderator: "bg-red-500/20 text-red-400 border-red-500/30",
};
