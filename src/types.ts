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
  createdAt: any;
  updatedAt: any;
  collaborators: string[];
  isPublic: boolean;
  isTemplate: boolean;
  forksCount: number;
  views?: number;
  deployUrl?: string;
  liveUrl?: string;
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
  tags?: string[];
  parentTemplateId?: string;
  group?: string;            // user-defined project group name
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
  githubToken?: string;
  githubInstallationId?: string;
  skills?: string[];
  dailyStreak?: number;
  monthlyStreak?: number;
  links?: {
    github?: string;
    twitter?: string;
    website?: string;
  };
  preferences?: {
    fontSize?: number;
    tabSize?: number;
    uiTheme?: 'dark' | 'midnight' | 'ocean' | 'light';
  };
  birthday?: string;  // ISO date YYYY-MM-DD
  notifications?: {
    deployments?: boolean;
    adminAnnouncements?: boolean;
  };
  updatedAt?: any;
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
  | 'post_mention';

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

export type OrgMemberRole = "member" | "moderator" | "admin";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar?: string;
  isPublic: boolean;
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

// ── Real-time collaboration ────────────────────────────────────────────────────

/** Presence record written to projects/{projectId}/presence/{userId} */
export interface PresenceUser {
  userId: string;
  name: string;
  avatar: string;
  lastSeen: any;             // Firestore Timestamp
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
