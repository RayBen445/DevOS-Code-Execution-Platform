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
  createdAt: any;
  updatedAt: any;
  collaborators: string[];
  isPublic: boolean;
  isTemplate: boolean;
  forksCount: number;
  deployUrl?: string;
  liveUrl?: string;
  parentProjectId?: string;
  githubRepo?: string;
  githubUrl?: string;
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
