
// import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { LocalStorageService } from '@/lib/localStorage';
// import { authApi, ApiError } from '@/lib/api';

// interface User {
//   id: string;
//   email: string;
//   name: string;
//   isAdmin?: boolean;
//   isLeader: boolean;
//   groupId?: string;
//   createdAt: Date;
// }

// interface AuthContextType {
//   user: User | null;
//   login: (email: string, password: string) => Promise<boolean>;
//   loginWithGoogle: (token: string) => Promise<boolean>;
//   register: (name: string, email: string, password: string) => Promise<boolean>;
//   logout: () => void;
//   isAuthenticated: boolean;
//   isLoading: boolean;
//   isLeader: boolean;
//   updateUser: (updates: Partial<User>) => Promise<boolean>;
//   getAllUsers: () => Promise<User[]>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   // Note: We no longer maintain a local users store; authentication relies on backend only

//   // Load user data from token on mount
//   useEffect(() => {
//     const loadUserData = async () => {
//       try {
//         setIsLoading(true);
//         const token = LocalStorageService.loadAuthToken();
        
//         if (token) {
//           try {
//             // Try to get user profile from API
//             const userData = await authApi.getProfile();
//             setUser({
//               ...userData,
//               createdAt: new Date(userData.createdAt)
//             });
//           } catch (error) {
//             // If Unauthorized, clear stale token and user data
//             if (error && typeof error === 'object' && (error as any).status === 401) {
//               console.warn('Auth token invalid or expired. Clearing local session.');
//               LocalStorageService.clearAll();
//               setUser(null);
//             } else {
//               // Otherwise, do not trust local cache for auth
//               console.warn('Failed to get user profile from API. Ignoring local cache. Error:', error);
//               LocalStorageService.clearAll();
//               setUser(null);
//             }
//           }
//         }
//       } catch (error) {
//         console.error('Error loading user data:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     loadUserData();
//   }, []);

//   // Removed local users fallback initialization to ensure auth only via backend

//   const login = async (email: string, password: string): Promise<boolean> => {
//     try {
//       setIsLoading(true);
//       const userData = await authApi.login(email, password);
//       const user = {
//         ...userData,
//         createdAt: new Date(userData.createdAt)
//       };
//       LocalStorageService.saveAuthToken(userData.token);
//       LocalStorageService.saveUserData(user);
//       setUser(user);
//       return true;
//     } catch (error) {
//       // Do NOT fallback to local creation; only registered users may log in
//       console.error('Login failed:', error);
//       return false;
//     } finally {
//       setIsLoading(false);
//     }
//   };
  

//   const register = async (name: string, email: string, password: string): Promise<boolean> => {
//     try {
//       setIsLoading(true);
//       const userData = await authApi.register(name, email, password);
//       const user = {
//         ...userData,
//         createdAt: new Date(userData.createdAt)
//       };
//       LocalStorageService.saveAuthToken(userData.token);
//       LocalStorageService.saveUserData(user);
//       setUser(user);
//       return true;
//     } catch (error) {
//       // Do NOT fallback to local registration; require backend registration
//       console.error('Registration failed:', error);
//       return false;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const logout = () => {
//     LocalStorageService.clearAll();
//     setUser(null);
//   };

//   const updateUser = async (updates: Partial<User>): Promise<boolean> => {
//     if (!user) return false;

//     try {
//       setIsLoading(true);
      
//       // Try API update
//       try {
//         const userData = await authApi.updateProfile(updates);
        
//         // Convert createdAt string to Date object
//         const updatedUser = {
//           ...userData,
//           createdAt: new Date(userData.createdAt)
//         };
        
//         // Save updated user data
//         LocalStorageService.saveUserData(updatedUser);
        
//         // Update state
//         setUser(updatedUser);
//         return true;
//       } catch (error) {
//         console.error('API update failed:', error);
//         return false;
//       }
//     } catch (error) {
//       console.error('Update user failed:', error);
//       return false;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const loginWithGoogle = async (token: string): Promise<boolean> => {
//     try {
//       setIsLoading(true);
      
//       // Save the token
//       LocalStorageService.saveAuthToken(token);
      
//       // Get user profile with the token
//       const userData = await authApi.getProfile();
//       const user = {
//         ...userData,
//         createdAt: new Date(userData.createdAt)
//       };
      
//       // Save user data
//       LocalStorageService.saveUserData(user);
//       setUser(user);
//       return true;
//     } catch (error) {
//       console.error('Google login failed:', error);
//       return false;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const getAllUsers = async (): Promise<User[]> => {
//     try {
//       const apiUsers = await authApi.getUsers();
//       return apiUsers.map(user => ({
//         ...user,
//         createdAt: new Date(user.createdAt)
//       }));
//     } catch (error) {
//       console.error('Get all users failed:', error);
//       return [];
//     }
//   };

//   const isAuthenticated = !!user;
//   const isLeader = user?.isLeader || false;
//   const isAdmin = user?.isAdmin || false;

//   return (
//     <AuthContext.Provider value={{
//       user,
//       login,
//       loginWithGoogle,
//       register,
//       logout,
//       isAuthenticated,
//       isLoading,
//       isLeader,
//       updateUser,
//       getAllUsers
//     }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };


import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LocalStorageService } from '@/lib/localStorage';
import { authApi, ApiError } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
  isLeader: boolean;
  groupId?: string;
  guidesSeen?: {
    home?: boolean;
    createGroup?: boolean;
    dashboard: boolean;
    editor: boolean;
    gridBoard?: boolean;
  };
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (token: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLeader: boolean;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
  getAllUsers: () => Promise<User[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Note: We no longer maintain a local users store; authentication relies on backend only

  // Load user data from token on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const token = LocalStorageService.loadAuthToken();

        if (token) {
          try {
            // Try to get user profile from API
            const userData = await authApi.getProfile();
            setUser({
              ...userData,
              createdAt: new Date(userData.createdAt)
            });
          } catch (error) {
            // If Unauthorized, clear stale token and user data
            if (error && typeof error === 'object' && (error as any).status === 401) {
              console.warn('Auth token invalid or expired. Clearing local session.');
              LocalStorageService.clearAll();
              setUser(null);
            } else {
              // Otherwise, do not trust local cache for auth
              console.warn('Failed to get user profile from API. Ignoring local cache. Error:', error);
              LocalStorageService.clearAll();
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Removed local users fallback initialization to ensure auth only via backend

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const userData = await authApi.login(email, password);
      const user = {
        ...userData,
        createdAt: new Date(userData.createdAt)
      };
      LocalStorageService.saveAuthToken(userData.token);
      LocalStorageService.saveUserData(user);
      setUser(user);
      return true;
    } catch (error) {
      // Do NOT fallback to local creation; only registered users may log in
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };


  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const userData = await authApi.register(name, email, password);
      const user = {
        ...userData,
        createdAt: new Date(userData.createdAt)
      };
      LocalStorageService.saveAuthToken(userData.token);
      LocalStorageService.saveUserData(user);
      setUser(user);
      return true;
    } catch (error) {
      // Do NOT fallback to local registration; require backend registration
      console.error('Registration failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    LocalStorageService.clearAll();
    try {
      sessionStorage.removeItem('joinAsMember');
    } catch {
      // ignore
    }
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsLoading(true);

      // Try API update
      try {
        const userData = await authApi.updateProfile(updates);

        // Convert createdAt string to Date object
        const updatedUser = {
          ...userData,
          createdAt: new Date(userData.createdAt)
        };

        // Save updated user data
        LocalStorageService.saveUserData(updatedUser);

        // Update state
        setUser(updatedUser);
        return true;
      } catch (error) {
        console.error('API update failed:', error);
        return false;
      }
    } catch (error) {
      console.error('Update user failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Save the token
      LocalStorageService.saveAuthToken(token);

      // Get user profile with the token
      const userData = await authApi.getProfile();
      const user = {
        ...userData,
        createdAt: new Date(userData.createdAt)
      };

      // Save user data
      LocalStorageService.saveUserData(user);
      setUser(user);
      return true;
    } catch (error) {
      console.error('Google login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      const apiUsers = await authApi.getUsers();
      return apiUsers.map(user => ({
        ...user,
        createdAt: new Date(user.createdAt)
      }));
    } catch (error) {
      console.error('Get all users failed:', error);
      return [];
    }
  };

  const isAuthenticated = !!user;
  const isLeader = user?.isLeader || false;
  const isAdmin = user?.isAdmin || false;

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWithGoogle,
      register,
      logout,
      isAuthenticated,
      isLoading,
      isLeader,
      updateUser,
      getAllUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
};