// Core types for the application

export const STORAGE_KEYS = {
  PROJECTS: 'signaturedaytshirt_projects',
  CURRENT_PROJECT: 'signaturedaytshirt_current_project',
  USER_PREFERENCES: 'signaturedaytshirt_user_preferences'
} as const;

export interface User {
  id: string;
  name: string;
  email: string;
  isLeader?: boolean;
  groupId?: string;
}

export interface Member {
  id: string;
  name: string;
  photoUrl: string;
  hasSubmitted: boolean;
  uploadedAt?: string;
}

export interface MemberSubmission {
  id: string;
  memberId: string;
  name: string;
  photoUrl: string;
  uploadedAt: string;
  croppedPhotoUrl?: string;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  year: string;
  createdAt: string;
  totalMembers: number;
  submittedMembers: number;
  gridType: string;
  status: 'active' | 'completed' | 'archived';
  groupName?: string;
  occasion?: string;
  memberCount?: number;
  gridStyle?: string;
  schoolLogo?: string;
  submissions?: MemberSubmission[];
  votes?: {
    hexagonal: number;
    square: number;
    circular: number;
  };
}

export interface Group {
  id: string;
  name: string;
  year: string;
  memberCount: number;
  gridType: string;
  createdAt: string;
  leaderId: string;
  members: Member[];
}

export interface GridLayout {
  id: string;
  name: string;
  gridType: string;
  memberCount: number;
  votes: number;
}
