import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { LocalStorageService } from '@/lib/localStorage';
import { groupApi } from '@/lib/api';
import { useAuth } from './AuthContext';

export type GridTemplate = 'square' | 'hexagonal' | 'any';

/** Leader-controlled layout mode: locked Square, locked Hexagon, or members vote. */
export type LayoutMode = 'square' | 'hexagonal' | 'voting';

export interface Member {
  id: string;
  name: string;
  email?: string;
  photo: string;
  vote: GridTemplate;
  joinedAt: Date;
  memberRollNumber: string;
  size?: 's' | 'm' | 'l' | 'xl' | 'xxl';
  phone?: string;
  zoomLevel?: number;
}

export interface Group {
  id: string;
  name: string;
  yearOfPassing: string;
  totalMembers: number;
  leaderId?: string;
  /**
   * If set, this group was created via an ambassador referral.
   * Used for ambassador vs non-ambassador pricing and rewards.
   */
  ambassadorId?: string | null;
  /** Leader choice: square (locked), hexagonal (locked), or voting (members choose). */
  layoutMode?: LayoutMode;
  gridTemplate: GridTemplate;
  shareLink: string;
  createdAt: Date;
  members: Member[];
  votes: Record<GridTemplate, number>;
}

interface CollageContextType {
  groups: Record<string, Group>;
  createGroup: (groupData: Omit<Group, 'id' | 'shareLink' | 'createdAt' | 'members' | 'votes'> & { layoutMode?: LayoutMode; phone?: string; phoneVerified?: boolean }) => Promise<string>;
  joinGroup: (groupId: string, memberData: Omit<Member, 'id' | 'joinedAt'> & { phone?: string; phoneVerified?: boolean }) => Promise<boolean>;
  getGroup: (groupId: string, forceRefresh?: boolean) => Promise<Group | undefined>;
  updateGroupTemplate: (groupId: string) => Promise<void>;
  getAllGroups: () => Promise<Group[]>;
  deleteGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const CollageContext = createContext<CollageContextType>({
  groups: {},
  createGroup: async () => '',
  joinGroup: async () => false,
  getGroup: async () => undefined,
  updateGroupTemplate: async () => { },
  getAllGroups: async () => [],
  deleteGroup: async () => { },
  updateGroup: async () => { },
  isLoading: true,
  error: null
});

export const useCollage = () => {
  const context = useContext(CollageContext);
  return context;
};

// Helper function to convert API date strings to Date objects and normalize layout/votes
const convertDates = (group: any): Group => {
  const layoutMode = group.layoutMode ?? 'voting';
  // gridTemplate usually won't be 'any' for the group itself, but keeping type safety
  const gridTemplate = (group.gridTemplate === 'hexagonal' || group.gridTemplate === 'any') ? group.gridTemplate : 'square';
  const votes = {
    square: typeof group.votes?.square === 'number' ? group.votes.square : 0,
    hexagonal: typeof group.votes?.hexagonal === 'number' ? group.votes.hexagonal : 0,
    any: typeof group.votes?.any === 'number' ? group.votes.any : 0
  };
  return {
    ...group,
    layoutMode,
    gridTemplate,
    votes,
    createdAt: new Date(group.createdAt),
    members: (group.members || []).map((member: any) => ({
      ...member,
      joinedAt: new Date(member.joinedAt)
    }))
  };
};

export const CollageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<Record<string, Group>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Keep track of groups in a ref for access inside stable callbacks
  const groupsRef = useRef(groups);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // Load groups from API or localStorage on mount and when auth state changes
  useEffect(() => {
    const loadGroups = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (isAuthenticated && user?.isLeader) {
          // If user is a leader, try to get all groups from API
          try {
            const apiGroups = await groupApi.getGroups();
            const formattedGroups: Record<string, Group> = {};

            apiGroups.data.forEach((group: any) => {
              const id = group._id || group.id;
              formattedGroups[id] = convertDates(group);
            });

            setGroups(formattedGroups);
          } catch (error) {
            console.warn('API get groups failed, using localStorage fallback:', error);
            // Fallback to localStorage
            const savedGroups = LocalStorageService.loadGroups();
            setGroups(savedGroups);
          }
        } else if (isAuthenticated && user?.groupId) {
          // If user belongs to a group, get that specific group
          try {
            const groupData = await groupApi.getGroupById(user.groupId);
            if (groupData) {
              const formattedGroup = convertDates(groupData);
              setGroups({ [formattedGroup.id]: formattedGroup });
            }
          } catch (error) {
            console.warn('API get group failed, using localStorage fallback:', error);
            // Fallback to localStorage
            const savedGroups = LocalStorageService.loadGroups();
            setGroups(savedGroups);
          }
        } else {
          // Not authenticated or no group association, use localStorage
          const savedGroups = LocalStorageService.loadGroups();
          setGroups(savedGroups);
        }
      } catch (error) {
        console.error('Error loading groups:', error);
        setError('Failed to load groups');

        // Fallback to localStorage in case of any error
        try {
          const savedGroups = LocalStorageService.loadGroups();
          setGroups(savedGroups);
        } catch (localError) {
          console.error('Even localStorage fallback failed:', localError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [isAuthenticated, user]);

  // Save groups to localStorage whenever groups change (as a backup)
  useEffect(() => {
    if (Object.keys(groups).length > 0) {
      const saveGroupsAsync = async () => {
        try {
          await LocalStorageService.saveGroups(groups);
        } catch (error) {
          console.error('Error saving groups to localStorage:', error);
        }
      };
      saveGroupsAsync();
    }
  }, [groups]);

  const createGroup = useCallback(async (groupData: Omit<Group, 'id' | 'shareLink' | 'createdAt' | 'members' | 'votes'> & { phone?: string; phoneVerified?: boolean }): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try API first
      try {
        const newGroupData = await groupApi.createGroup(groupData as any);
        const formattedGroup = convertDates(newGroupData);

        setGroups(prev => ({
          ...prev,
          [formattedGroup.id]: formattedGroup
        }));

        return formattedGroup.id;
      } catch (error) {
        console.warn('API create group failed, using localStorage fallback:', error);

        // Fallback to localStorage
        const id = Math.random().toString(36).substr(2, 9);
        const shareLink = `/join/${id}`;

        const newGroup: Group = {
          ...groupData,
          id,
          shareLink,
          createdAt: new Date(),
          members: [],
          layoutMode: groupData.layoutMode ?? 'square',
          votes: { square: 0, hexagonal: 0, any: 0 }
        };

        setGroups(prev => ({ ...prev, [id]: newGroup }));
        return id;
      }
    } catch (error) {
      console.error('Create group failed:', error);
      setError('Failed to create group');
      return '';
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinGroup = useCallback(async (groupId: string, memberData: Omit<Member, 'id' | 'joinedAt'> & { phone?: string; phoneVerified?: boolean }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try API first
      try {
        const joinResponse = await groupApi.joinGroup(groupId, memberData as any);

        // Refresh group data after joining
        const updatedGroupData = await groupApi.getGroupById(groupId);
        const formattedGroup = convertDates(updatedGroupData);

        setGroups(prev => ({
          ...prev,
          [groupId]: formattedGroup
        }));

        return true;
      } catch (error) {
        console.warn('API join group failed, using localStorage fallback:', error);

        // Fallback to localStorage
        const currentGroups = groupsRef.current;
        const group = currentGroups[groupId];
        if (!group || group.members.length >= group.totalMembers) {
          return false;
        }

        const memberId = Math.random().toString(36).substr(2, 9);
        const newMember: Member = {
          ...memberData,
          id: memberId,
          joinedAt: new Date()
        };

        // Determine vote
        let vote: GridTemplate;
        if (memberData.vote === 'hexagonal') vote = 'hexagonal';
        else if (memberData.vote === 'any') vote = 'any';
        else vote = 'square';

        const updatedGroup = {
          ...group,
          members: [...group.members, newMember],
          votes: {
            square: (group.votes?.square ?? 0) + (vote === 'square' ? 1 : 0),
            hexagonal: (group.votes?.hexagonal ?? 0) + (vote === 'hexagonal' ? 1 : 0),
            any: (group.votes?.any ?? 0) + (vote === 'any' ? 1 : 0)
          }
        };

        setGroups(prev => ({
          ...prev,
          [groupId]: updatedGroup
        }));

        return true;
      }
    } catch (error) {
      console.error('Join group failed:', error);
      setError('Failed to join group');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cache for template update requests to prevent excessive API calls
  const templateUpdateCache = useRef<Record<string, { timestamp: number }>>({});

  const updateGroupTemplate = useCallback(async (groupId: string): Promise<void> => {
    setError(null);

    try {
      const now = Date.now();
      const cachedUpdate = templateUpdateCache.current[groupId];
      if (cachedUpdate && (now - cachedUpdate.timestamp < 30000)) {
        return;
      }
      templateUpdateCache.current[groupId] = { timestamp: now };

      const currentGroups = groupsRef.current;
      const group = currentGroups[groupId];
      if (!group || group.layoutMode !== 'voting') return;

      const squareVotes = group.votes?.square ?? 0;
      const hexVotes = group.votes?.hexagonal ?? 0;
      if (squareVotes === hexVotes) return; // Tie or no votes: leader must finalize

      const winningTemplate: GridTemplate = squareVotes > hexVotes ? 'square' : 'hexagonal';
      if (winningTemplate === group.gridTemplate) return;

      const updatedGroup = { ...group, gridTemplate: winningTemplate };
      setGroups(prev => ({ ...prev, [groupId]: updatedGroup }));

      try {
        setTimeout(async () => {
          try {
            await groupApi.updateGroupTemplate(groupId, { gridTemplate: winningTemplate });
          } catch (error) {
            console.warn('Background template update failed:', error);
          }
        }, 500);
      } catch (error) {
        console.warn('API update template scheduling failed:', error);
      }
    } catch (error) {
      console.error('Update group template failed:', error);
      setError('Failed to update group template');
    }
  }, []);

  // Cache for getGroup requests to prevent excessive API calls
  const groupRequestCache = useRef<Record<string, { data: Group | undefined, timestamp: number }>>({});

  const getGroup = useCallback(async (groupId: string, forceRefresh: boolean = false): Promise<Group | undefined> => {
    try {
      // Skip cache checks if force refresh is requested
      if (!forceRefresh) {
        // Check local state first
        const currentGroups = groupsRef.current;
        const localGroup = currentGroups[groupId];
        if (localGroup) {
          console.log('Using local group data');
          return localGroup;
        }

        // Check cache (valid for 30 seconds)
        const now = Date.now();
        const cachedRequest = groupRequestCache.current[groupId];
        if (cachedRequest && (now - cachedRequest.timestamp < 30000)) {
          console.log('Using cached group data');
          return cachedRequest.data;
        }
      } else {
        console.log('Force refresh requested, skipping cache');
      }

      // Try API with minimal loading state
      const loadingTimeout = setTimeout(() => setIsLoading(true), 500); // Only show loading after 500ms

      try {
        const groupData = await groupApi.getGroupById(groupId);
        const formattedGroup = convertDates(groupData);

        // Update caches
        const now = Date.now();
        setGroups(prev => ({ ...prev, [groupId]: formattedGroup }));
        groupRequestCache.current[groupId] = { data: formattedGroup, timestamp: now };

        return formattedGroup;
      } catch (error) {
        console.warn('API get group failed:', error);
        setError('Failed to get group');
        return undefined;
      } finally {
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Get group failed:', error);
      setError('Failed to get group');
      return undefined;
    }
  }, []);

  const getAllGroups = useCallback(async (): Promise<Group[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try API first
      try {
        const apiGroups = await groupApi.getGroups();
        const formattedGroups = apiGroups.data.map((group: any) => convertDates(group));

        // Update local cache
        const groupsMap: Record<string, Group> = {};
        formattedGroups.forEach(group => {
          groupsMap[group.id] = group;
        });

        setGroups(groupsMap);
        return formattedGroups;
      } catch (error) {
        console.warn('API get all groups failed, using localStorage fallback:', error);
        // Fallback to localStorage
        const currentGroups = groupsRef.current;
        return Object.values(currentGroups);
      }
    } catch (error) {
      console.error('Get all groups failed:', error);
      setError('Failed to get groups');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteGroup = useCallback(async (groupId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try API first
      try {
        await groupApi.deleteGroup(groupId);

        // Update local cache
        setGroups(prev => {
          const newGroups = { ...prev };
          delete newGroups[groupId];
          return newGroups;
        });
      } catch (error) {
        console.warn('API delete group failed, using localStorage fallback:', error);

        // Fallback to localStorage
        setGroups(prev => {
          const newGroups = { ...prev };
          delete newGroups[groupId];
          return newGroups;
        });
      }
    } catch (error) {
      console.error('Delete group failed:', error);
      setError('Failed to delete group');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateGroup = useCallback(async (groupId: string, updates: Partial<Group>): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try API first
      try {
        await groupApi.updateGroup(groupId, updates);

        // Refresh group data after updating
        const updatedGroupData = await groupApi.getGroupById(groupId);
        const formattedGroup = convertDates(updatedGroupData);

        setGroups(prev => ({
          ...prev,
          [groupId]: formattedGroup
        }));
      } catch (error) {
        console.warn('API update group failed, using localStorage fallback:', error);

        // Fallback to localStorage
        setGroups(prev => {
          const current = prev[groupId];
          if (!current) return prev;

          return {
            ...prev,
            [groupId]: { ...current, ...updates }
          };
        });
      }
    } catch (error) {
      console.error('Update group failed:', error);
      setError('Failed to update group');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const contextValue = useMemo(() => ({
    groups,
    createGroup,
    joinGroup,
    getGroup,
    updateGroupTemplate,
    getAllGroups,
    deleteGroup,
    updateGroup,
    isLoading,
    error
  }), [groups, createGroup, joinGroup, getGroup, updateGroupTemplate, getAllGroups, deleteGroup, updateGroup, isLoading, error]);

  return (
    <CollageContext.Provider value={contextValue}>
      {children}
    </CollageContext.Provider>
  );
};