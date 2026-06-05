export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface Project {
  id: string;
  name: string;
  title?: string;
  description?: string;
  ownerId: string;
  ownerUsername?: string;
  ownerType?: "user" | "organization";
  ownerOrgId?: string;
  ownerOrgSlug?: string;
  ownerOrgName?: string;
  projectSlug?: string;
  slug?: string;
  deployed?: boolean;
  createdAt: any;
  updatedAt: any;
  collaborators: string[];
  isPublic: boolean;
  isTemplate: boolean;
  isOfficial?: boolean;
  forksCount: number;
  views?: number;
  deployUrl?: string;
  liveUrl?: string;
  vercelUrl?: string;
  deployTarget?: 'internal' | 'cloudrun' | 'vercel';
  parentProjectId?: string;
  forkedFrom?: string;           // projectId of the source project
  forkedFromOwner?: string;      // username of the source project owner
  githubRepo?: string;
  githubUrl?: string;
  isSystem?: boolean;
  systemType?: 'portfolio' | 'blog' | 'docs';
  isEditable?: boolean;
  isDeletable?: boolean;
  draft?: any;
  published?: any;
  deployStatus?: 'idle' | 'building' | 'success' | 'failed';
  lastDeployedAt?: any;
  deployError?: string;
  entryFile?: string;
  savedAt?: any;
  env?: Record<string, string>;
  plugins?: Record<string, InstalledPlugin>;
  tags?: string[];
  parentTemplateId?: string;
  group?: string;            // user-defined project group name
  language?: string;         // primary language, e.g. "HTML", "JavaScript"
  framework?: string;        // framework name, e.g. "React"
  thumbnailUrl?: string;     // project thumbnail / preview image
  forkedFromTitle?: string;  // display title of the source project
  /** ID of the currently active deployment (used for instant rollback) */
  activeDeploymentId?: string | null;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  timestamp: any;
  snapshot: {
    portfolio: any;
    layout: any;
    theme: any;
  };
  message: string;
}

export interface FileData {
  id: string;
  projectId: string;
  name: string;
  path: string;
  content: string;
  language: string;
  updatedAt: string;
}

export interface Commit {
  id: string;
  projectId: string;
  message: string;
  authorId: string;
  authorName: string;
  timestamp: any;
  filesSnapshot: {
    name: string;
    path: string;
    content: string;
    language: string;
  }[];
}

export interface PullRequest {
  id: string;
  projectId: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  status: 'open' | 'merged' | 'closed';
  timestamp: any;
  headCommitId: string;
}

export interface UserSettings {
  username?: string;
  displayName?: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  avatar?: string;
  bannerUrl?: string;
  githubToken?: string;
  githubInstallationId?: string;
  skills?: string[];
  dailyStreak?: number;
  monthlyStreak?: number;
  links?: {
    github?: string;
    twitter?: string;
    website?: string;
    linkedin?: string;
  };
  preferences?: {
    fontSize?: number;
    tabSize?: number;
    uiTheme?: 'system' | 'dark' | 'midnight' | 'ocean' | 'light' | 'sunset';
  };
  birthday?: string;  // ISO date YYYY-MM-DD
  notifications?: {
    deployments?: boolean;
    adminAnnouncements?: boolean;
  };
  bottomNavButtons?: string[];
  topNavButtons?: string[];
  availableForWork?: boolean;
  updatedAt?: any;
  isOfficial?: boolean;
  portfolioLayout?: 'classic' | 'developer' | 'minimal' | 'bento';
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  files: {
    name: string;
    path: string;
    content: string;
    language: string;
  }[];
  downloads: number;
  likes: number;
  isApproved: boolean;
  isOfficial?: boolean;
  createdAt: any;
  updatedAt: any;
  tags?: string[];
  previewImageUrl?: string;
}

export interface GiftedCredit {
  id: string;           // uuid so we can prune individual entries
  amount: number;
  expiresAt: any | null; // Firestore Timestamp or null = never expires
  grantedAt: any;
}

export type CreditTransactionType =
  | "deduct"
  | "daily_reset"
  | "monthly_reset"
  | "gift"
  | "unlimited_grant"
  | "adjust"
  | "redeem";

export interface CreditTransaction {
  id: string;
  type: CreditTransactionType;
  /** Positive = credit added, negative = credit deducted */
  delta: number;
  /** Human-readable label, e.g. "createProject", "gift", "redeem DEVOS24" */
  label: string;
  createdAt: any;
}

export interface Credits {
  daily: number;
  monthly: number;
  lastDailyReset: any;
  lastMonthlyReset: any;
  gifted?: GiftedCredit[];              // admin-gifted credits with optional expiry
  creditsUnlimitedUntil?: any | null;   // Firestore Timestamp — user has ∞ credits until this date
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  /** Automatically assigned on signup: <username>.devos.kontyra.name.ng */
  subdomain?: string;
  birthday?: string;        // ISO date string YYYY-MM-DD
  role?: 'user' | 'admin' | 'company';
  status?: 'active' | 'suspended' | 'banned' | 'deactivated';
  companyName?: string;
  verified?: boolean;
  skills?: string[];
  dailyStreak?: number;
  monthlyStreak?: number;
  lastActiveDate?: string; // ISO date string "YYYY-MM-DD"
  credits?: Credits;
  links?: {
    github?: string;
    twitter?: string;
    website?: string;
  };
  unlockedThemes?: string[];
  updatedAt: any;
}

export type NotificationType =
  | 'deployment_success'
  | 'deployment_failed'
  | 'credit_warning'
  | 'system_update'
  | 'admin_message'
  | 'follow'
  | 'post_comment'
  | 'post_repost'
  | 'post_like'
  | 'post_mention'
  | 'like'
  | 'community_join'
  | 'org_join'
  | 'mention'
  | 'event_rsvp'
  | 'event_approved'
  | 'event_rejected'
  | 'event_reminder'
  | 'bot_command'
  | 'project_created'
  | 'project_deleted'
  | 'profile_updated'
  | 'credits_redeemed'
  | 'password_changed'
  | 'template_published'
  | 'org_role_updated'
  | 'org_approved'
  | 'org_rejected'
  | 'community_moderated'
  | 'event_created'
  | 'username_change_requested';

export interface Notification {
  id: string;
  userId: string; // specific uid or "all" for broadcast
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // navigation target when clicked
  isRead?: boolean; // for targeted (userId != "all")
  readBy?: string[]; // for broadcast (userId == "all")
  createdAt: any;
  createdBy: string;
  projectId?: string;
}

export interface FeedPost {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  authorRole?: 'user' | 'admin' | 'company';
  content: string;
  type: 'update' | 'deployment' | 'snippet' | 'announcement' | 'feature' | 'repost';
  projectId?: string;
  projectName?: string;
  createdAt: any;
  likes: number;
  likedBy?: string[];
  commentsCount?: number;
  repostCount?: number;
  viewsCount?: number;
  isPublic: boolean;
  isOfficial?: boolean;
  communityId?: string;
  communityName?: string;
  communitySlug?: string;
  mentions?: string[]; // usernames @mentioned in the post
  // Repost fields
  originalPostId?: string;
  originalPost?: Omit<FeedPost, 'originalPost'>; // embedded snapshot for display
}

export interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  content: string;
  createdAt: any;
  mentions?: string[]; // usernames @mentioned in the comment
}

export interface UsernameChangeRequest {
  id: string;
  uid: string;
  currentUsername: string;
  requestedUsername: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  resolvedAt?: any;
  resolvedBy?: string;
  rejectionReason?: string;
}

export interface RedeemCode {
  id: string; // the code itself
  type: 'credits';
  value: number; // credit amount
  expiresAt: any | null;
  usageLimit: number; // -1 = unlimited
  usedCount: number;
  perUserLimit: number; // 1 = once per user
  isActive: boolean;
  createdBy: string;
  createdAt: any;
}

export interface Referral {
  id: string;
  referrerId: string;        // uid of the user who shared the link
  referredId: string;        // uid of the new user who signed up
  referralCode: string;
  createdAt: any;
}

export interface ReferralStats {
  code: string;
  totalReferrals: number;
  referrals: Referral[];
}

// ── Organization System ─────────────────────────────────────────────────────

/**
 * RBAC roles for organization members.
 * Precedence (highest → lowest): owner > admin > developer > viewer
 * Legacy values "member" and "moderator" are kept for backward compatibility;
 * they are treated as "developer" and "admin" respectively in permission checks.
 */
export type OrgMemberRole =
  | "owner"
  | "admin"
  | "developer"
  | "viewer"
  // Legacy — kept for backward compatibility
  | "member"
  | "moderator";

/** Actions that can be checked via checkPermission() */
export type OrgPermission =
  | "create_project"
  | "deploy_project"
  | "run_project"
  | "preview_project"
  | "manage_members"
  | "view_project"
  | "delete_project"
  | "update_project";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar?: string;
  isPublic: boolean;
  isOfficial?: boolean;
  joinPolicy?: "open" | "request";
  chatEnabled?: boolean;
  voiceCallsEnabled?: boolean;
  createdBy: string;
  memberCount: number;
  createdAt: any;
  updatedAt: any;
}

export interface OrgMember {
  id: string;
  userId: string;
  username: string;
  role: OrgMemberRole;
  joinedAt: any;
}

export interface OrgJoinRequest {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  requestedAt: any;
  status: "pending" | "approved" | "rejected";
}

export interface OrgChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
  createdAt: any;
  replyToId?: string;
  replyToText?: string;
  replyToUsername?: string;
}

// ── Community System ────────────────────────────────────────────────────────

export type CommunityMemberRole = "member" | "moderator" | "admin";

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar?: string;
  banner?: string;
  createdBy: string;
  memberCount: number;
  isPublic: boolean;
  isOfficial?: boolean;
  category?: string;
  chatEnabled?: boolean;
  voiceCallsEnabled?: boolean;
  createdAt: any;
}

export interface CommunityMember {
  userId: string;
  role: CommunityMemberRole;
  joinedAt: any;
}

export interface CommunityChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
  createdAt: any;
  replyToId?: string;
  replyToText?: string;
  replyToUsername?: string;
}

// ── Polls ───────────────────────────────────────────────────────────────────

export interface PollOption {
  id: string;    // stable identifier
  text: string;  // option label
  votes: number; // vote count (denormalised for fast display)
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  allowTextInput: boolean;   // when true, voters may also type a free-text response
  maxSelections: number;     // 1 = single choice; >1 = multi-select (up to N options)
  allowGuestVoting: boolean; // when true, anonymous/unauthenticated users may vote
  allowMultipleVotes: boolean; // when true, a single user can vote more than once (overrides duplicate check)
  createdBy: string;         // admin uid
  createdAt: any;
  expiresAt?: any | null;    // Firestore Timestamp – null / absent = no expiry
  isOpen: boolean;           // admin can close a poll early
  totalVotes: number;        // denormalised sum for display
}

export interface PollVote {
  userId: string;
  optionIds: string[];        // one or more selected option IDs
  textResponse?: string;      // free-text answer (if allowTextInput and user supplied one)
  votedAt: any;
}

// ── Deployments ─────────────────────────────────────────────────────────────

/**
 * A deployment record written to the `deployments` Firestore collection
 * whenever a user publishes a project.
 */
export interface Deployment {
  id: string;
  projectId: string;
  userId: string;
  username: string;
  /** Public URL of the deployed project, e.g. https://project.username.devos.kontyra.name.ng */
  url: string;
  /** Per-commit preview URL, e.g. /@username/slug-a1b2c3 */
  previewUrl?: string | null;
  /** Git branch this deployment belongs to (default: "main") */
  branch?: string;
  /** Short commit hash (8 chars) used for preview URL generation */
  commitHash?: string;
  /** Whether this is the currently active (live) deployment for its branch */
  isActive?: boolean;
  status: 'building' | 'ready' | 'failed';
  buildCommand?: string;
  outputDir?: string;
  framework?: string;
  deployTarget?: 'internal' | 'cloudrun' | 'vercel';
  createdAt: any;
  completedAt?: any;
  error?: string;
}

// ── Real-time collaboration ────────────────────────────────────────────────────

/** Presence record written to projects/{projectId}/presence/{userId} */
export interface PresenceUser {
  userId: string;
  name: string;
  avatar: string;
  lastSeen: any;             // Firestore Timestamp
  active?: boolean;
  currentFile: string | null;
}

/** Activity record written to projects/{projectId}/activity/{id} */
export interface ActivityItem {
  id: string;
  userId: string;
  action: "save" | "edit" | "deploy";
  file?: string | null;
  timestamp: any;            // Firestore Timestamp
}

/** Platform-level user activity tracked in user_activities/{id} for the heatmap */
export type UserActivityType =
  | "project_create"
  | "project_fork"
  | "deploy"
  | "code_run"
  | "post"
  | "event_rsvp"
  | "event_create"
  | "community_join";

export interface UserActivity {
  id: string;
  userId: string;
  type: UserActivityType;
  projectId?: string;
  eventId?: string;
  postId?: string;
  createdAt: any; // Firestore Timestamp (serverTimestamp)
}

// ── Events Platform ──────────────────────────────────────────────────────────

export interface Chapter {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  createdAt: any;
}

export interface EventSeries {
  id: string;
  orgId: string;
  title: string;
  slug: string;
  description: string;
  createdAt: any;
}

export type EventType = "online" | "physical";
export type EventStatus = "pending" | "under_review" | "approved" | "rejected";

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  bannerImage?: string;
  type: EventType;
  /** URL for online events */
  eventLink?: string;
  /** Venue name for physical events */
  venueName?: string;
  /** Address for physical events */
  address?: string;
  startDate: any;
  endDate: any;
  orgId?: string;
  chapterId?: string;
  seriesId?: string;
  createdBy: string;
  createdByUsername?: string;
  status: EventStatus;
  isPremium: boolean;
  createdAt: any;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  /** uid of the registered user, null for guest registrations */
  userId?: string | null;
  source: "guest" | "user";
  createdAt: any;
}

export interface Speaker {
  id: string;
  name: string;
  slug: string;
  title: string;
  bio: string;
  image?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  createdAt: any;
}

export interface EventSpeaker {
  id: string;
  eventId: string;
  speakerId: string;
  role: "speaker" | "host" | "panelist";
}

// ── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAction =
  | "create_project"
  | "update_project"
  | "delete_project"
  | "run_project"
  | "preview_project"
  | "deploy_project"
  | "login"
  | "switch_workspace"
  // Build system
  | "build_queued"
  | "build_started"
  | "build_completed"
  | "build_failed"
  // Cache & diff
  | "cache_hit"
  | "cache_miss"
  | "diff_detected"
  | "deployment_size_reduced"
  // Rollback & branch
  | "rollback_triggered"
  | "branch_deployed"
  | "deployment_promoted"
  // Validation
  | "type_check_started"
  | "type_check_passed"
  | "type_check_failed"
  | "build_check_failed"
  // Email
  | "email_queued"
  | "email_sent"
  | "email_failed"
  | "email_retried";

export interface AuditLog {
  id: string;
  userId: string;
  orgId?: string | null;
  projectId?: string | null;
  action: AuditAction;
  /** Arbitrary JSON metadata, e.g. framework, status, build command */
  metadata?: Record<string, any>;
  createdAt: any;
}

// ── Execution Detection ──────────────────────────────────────────────────────

export type DetectedFramework =
  | "Next.js"
  | "React"
  | "Vue"
  | "Vite"
  | "Node.js"
  | "Static"
  | "Unknown";

export interface DetectionResult {
  framework: DetectedFramework;
  buildCommand: string | null;
  devCommand: string | null;
  startCommand: string | null;
  outputDir: string | null;
  /** true when a package.json was found */
  hasPackageJson: boolean;
  /** true when an index.html was found at root or public/ */
  hasIndexHtml: boolean;
}

// ── Build Cache ──────────────────────────────────────────────────────────────

/**
 * Cached build record keyed by a SHA-256 hash of all source files.
 * Stored in `build_cache/{hash}`.
 */
export interface BuildCache {
  id: string;            // === hash (document ID)
  projectId: string;
  hash: string;
  framework: DetectedFramework;
  outputDir: string | null;
  /** Serialised output files (path → content) — capped at ~1 MB */
  outputFiles: Array<{ path: string; content: string }>;
  createdAt: any;
}

// ── Deployment Diffing ───────────────────────────────────────────────────────

/**
 * Per-file hash snapshot from the last successful deployment.
 * Stored in `deployment_files/{projectId}`.
 */
export interface DeploymentSnapshot {
  projectId: string;
  /** map of normalised file path → SHA-256 hex digest of content */
  fileHashes: Record<string, string>;
  updatedAt: any;
}

export interface DeployDiffResult {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
  /** true when there are no changes — skip deploy */
  isIdentical: boolean;
}

// ── Build Queue ──────────────────────────────────────────────────────────────

export type BuildJobStatus = "queued" | "running" | "success" | "failed";
export type BuildJobPriority = "normal" | "high";

export interface BuildJob {
  id: string;
  projectId: string;
  userId: string;
  /** Short hash of the source files at the time of queuing */
  commitHash: string;
  status: BuildJobStatus;
  priority: BuildJobPriority;
  framework?: DetectedFramework;
  buildCommand?: string | null;
  outputDir?: string | null;
  /** Preview URL generated after a successful build */
  previewUrl?: string | null;
  logs?: string[];
  createdAt: any;
  startedAt?: any | null;
  finishedAt?: any | null;
  error?: string | null;
}

// ── Project Validation ───────────────────────────────────────────────────────

export interface ValidationError {
  file: string;
  line: number;
  col: number;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  status: "success" | "error" | "warning" | "skipped";
  errors: ValidationError[];
  /** Full raw output for display */
  rawOutput?: string;
  /** Hash of files at the time of last check — for cache skipping */
  cachedHash?: string;
  durationMs?: number;
}

// ── Email System ─────────────────────────────────────────────────────────────

export type EmailJobStatus = "queued" | "processing" | "sent" | "failed";

export interface EmailJob {
  id: string;
  to: string;
  subject?: string;
  templateKey: string;
  payload: Record<string, any>;
  status: EmailJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  scheduledAt: any;
  createdAt: any;
  updatedAt: any;
}

export interface EmailTemplate {
  id: string;
  key: string;           // unique slug, e.g. "welcome", "forgot_password"
  name: string;
  subject: string;
  html: string;          // raw HTML with {{variable}} placeholders
  version: number;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

// ── Notification Settings ────────────────────────────────────────────────────

export interface UserNotificationSettings {
  userId: string;
  emailEnabled: boolean;
  types: {
    deploy?: boolean;
    event?: boolean;
    comment?: boolean;
    bot?: boolean;
    system?: boolean;
  };
}

// ── Plugin System ────────────────────────────────────────────────────────────

export type PluginId =
  | "devos-auth"
  | "devos-database"
  | "devos-storage"
  | "devos-email"
  | "devos-realtime"
  | "devos-queue"
  | "devos-webhooks"
  | "devos-analytics"
  | "devos-search"
  | "devos-push"
  | "devos-flags"
  | "devos-forms";

export interface InstalledPlugin {
  pluginId: PluginId;
  installedAt: any;
  /** Env vars injected into the project when this plugin was installed */
  envVars: string[];
  /** Opaque plugin-scoped key generated at install time */
  projectKey: string;
  enabled: boolean;
}

// ── Branching ────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  projectId: string;
  name: string;
  createdAt: any;
  createdBy: string;
  baseBranch: string;
  /** Snapshot of files at branch-creation time */
  filesSnapshot: {
    name: string;
    path: string;
    content: string;
    language: string;
  }[];
  merged?: boolean;
  mergedAt?: any;
}

// ── Portfolio System ─────────────────────────────────────────────────────────

export interface PortfolioPage {
  id: string;
  slug: string;
  title: string;
  content: string;
}

export interface PortfolioGlobalSettings {
  navbar: {
    style: 'classic' | 'minimal' | 'hidden';
    logo: string;
  };
  footer: {
    text: string;
    showSocials: boolean;
  };
  layout: 'classic' | 'developer' | 'minimal' | 'bento';
}

export interface PortfolioData {
  bio: string;
  links: Array<{ platform: string; url: string }>;
  featuredProjects: string[];
  pages?: PortfolioPage[];
  global?: PortfolioGlobalSettings;
}
