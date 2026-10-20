import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole, User } from '../types/auth';

interface AuthContextType {
  token: string | null;
  role: UserRole;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, role: UserRole, username: string, name?: string) => void;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dev flag: default to true to allow dev workflow without backend if needed
const DEV_DISABLE_AUTH = import.meta.env.VITE_DEV_DISABLE_AUTH !== 'false';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
  });

  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = (sessionStorage.getItem('user_role') || localStorage.getItem('user_role')) as UserRole;
    if (savedRole) return savedRole;
    return 'CORPS_COMMANDER';
  });

  const [username, setUsername] = useState<string>(() => {
    return sessionStorage.getItem('user_name') || localStorage.getItem('user_name') || 'commander_alpha';
  });

  const [officerName, setOfficerName] = useState<string>(() => {
    return sessionStorage.getItem('officer_name') || localStorage.getItem('officer_name') || 'Brig. K. Singh';
  });

  // Keep sessionStorage and localStorage in sync
  useEffect(() => {
    if (token) {
      sessionStorage.setItem('access_token', token);
      sessionStorage.setItem('user_role', role);
      sessionStorage.setItem('user_name', username);
      sessionStorage.setItem('officer_name', officerName);

      localStorage.setItem('access_token', token);
      localStorage.setItem('user_role', role);
      localStorage.setItem('user_name', username);
      localStorage.setItem('officer_name', officerName);
    }
  }, [token, role, username, officerName]);

  const login = (newToken: string, newRole: UserRole, newUsername: string, newName?: string) => {
    sessionStorage.setItem('access_token', newToken);
    sessionStorage.setItem('user_role', newRole);
    sessionStorage.setItem('user_name', newUsername);
    const resolvedName = newName || (newRole === 'CORPS_COMMANDER' ? 'Brig. K. Singh' : newRole === 'LOGISTICS_OFFICER' ? 'Maj. V. Rathore' : 'Capt. C. Edge');
    sessionStorage.setItem('officer_name', resolvedName);
    sessionStorage.removeItem('explicit_logout');

    localStorage.setItem('access_token', newToken);
    localStorage.setItem('user_role', newRole);
    localStorage.setItem('user_name', newUsername);
    localStorage.setItem('officer_name', resolvedName);
    localStorage.removeItem('explicit_logout');
    
    setToken(newToken);
    setRole(newRole);
    setUsername(newUsername);
    setOfficerName(resolvedName);
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user_role');
    sessionStorage.removeItem('user_name');
    sessionStorage.removeItem('officer_name');
    sessionStorage.setItem('explicit_logout', 'true');

    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('officer_name');
    localStorage.setItem('explicit_logout', 'true');
    setToken(null);
  };

  const switchRole = (newRole: UserRole) => {
    const defaultUsernames: Record<UserRole, string> = {
      CORPS_COMMANDER: 'commander_alpha',
      LOGISTICS_OFFICER: 'logistics_bravo',
      EDGE_READ_ONLY: 'edge_charlie',
    };
    const defaultNames: Record<UserRole, string> = {
      CORPS_COMMANDER: 'Brig. K. Singh',
      LOGISTICS_OFFICER: 'Maj. V. Rathore',
      EDGE_READ_ONLY: 'Capt. C. Edge',
    };
    const newUsername = defaultUsernames[newRole] || 'commander_alpha';
    const newName = defaultNames[newRole] || 'Maj. V. Rathore';

    sessionStorage.setItem('user_role', newRole);
    sessionStorage.setItem('user_name', newUsername);
    sessionStorage.setItem('officer_name', newName);

    setRole(newRole);
    setUsername(newUsername);
    setOfficerName(newName);
  };

  const isExplicitLogout = sessionStorage.getItem('explicit_logout') === 'true';
  const isAuthenticated = Boolean(token) || (DEV_DISABLE_AUTH && !isExplicitLogout);

  const user: User = {
    username,
    role,
    name: officerName,
    rank: role === 'CORPS_COMMANDER' ? 'BRIGADIER' : role === 'LOGISTICS_OFFICER' ? 'MAJOR' : 'CAPTAIN',
    sector: 'SECTOR-04 LEH-SIACHEN',
  };

  const isReadOnly = role === 'EDGE_READ_ONLY';

  return (
    <AuthContext.Provider value={{ token, role, user, isAuthenticated, login, logout, switchRole, isReadOnly }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
