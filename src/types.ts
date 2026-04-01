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
  env?: Record<string, string>;
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

export interface Credits {
  daily: number;
  monthly: number;
  lastDailyReset: any;
  lastMonthlyReset: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  role?: 'user' | 'admin';
  credits?: Credits;
  updatedAt: any;
}
