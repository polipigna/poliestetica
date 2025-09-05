'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// User type (same as in Header)
export interface User {
  name: string;
  role: 'admin' | 'segretaria' | 'responsabile';
  email: string;
}

// Context type
interface UserContextType {
  user: User;
  setUser: (user: User) => void;
  isAdmin: boolean;
  isSegretaria: boolean;
  isResponsabile: boolean;
  isDemoMode: boolean;
}

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider component
interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  // Check if we're in demo mode (development or explicitly enabled)
  const isDemoMode = process.env.NODE_ENV === 'development' || 
                     process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Initialize user state
  const [user, setUser] = useState<User>(() => {
    // In production, this would load from session/API
    // For now, start with default user
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('poliestetica-current-user');
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    // Default user
    return {
      name: 'Maria Rossi',
      role: 'admin',
      email: 'maria.rossi@poliestetica.com'
    };
  });

  // Update user and persist to localStorage (in demo mode)
  const updateUser = (newUser: User) => {
    setUser(newUser);
    
    // Persist to localStorage for demo
    if (typeof window !== 'undefined') {
      localStorage.setItem('poliestetica-current-user', JSON.stringify(newUser));
    }
    
    // In production, this would also update session/API
    console.log('User updated:', newUser);
  };

  // Computed properties for easy access
  const isAdmin = user.role === 'admin';
  const isSegretaria = user.role === 'segretaria';
  const isResponsabile = user.role === 'responsabile';

  // Context value
  const value: UserContextType = {
    user,
    setUser: updateUser,
    isAdmin,
    isSegretaria,
    isResponsabile,
    isDemoMode
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the user context
export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
}

// Utility functions for production (future implementation)
async function getUserFromSession(): Promise<User | null> {
  // In production, this would:
  // 1. Check local session/cookie
  // 2. Validate with backend
  // 3. Return user data or null
  
  // For now, return null to use default
  return null;
}

async function saveUserToSession(user: User): Promise<void> {
  // In production, this would:
  // 1. Update session/cookie
  // 2. Notify backend if needed
  
  // For now, just log
  console.log('Would save user to session:', user);
}

// Export demo users for consistency
export const DEMO_USERS: User[] = [
  { name: 'Maria Rossi', role: 'admin', email: 'maria.rossi@poliestetica.com' },
  { name: 'Giulia Bianchi', role: 'segretaria', email: 'giulia.bianchi@poliestetica.com' },
  { name: 'Paolo Verdi', role: 'responsabile', email: 'paolo.verdi@poliestetica.com' }
];