import { createContext, useContext } from 'react';
import type { ClientUserData } from '../lib/api';

export interface AuthContextValue {
  user: ClientUserData | null;
  loading: boolean;
  login: (user: ClientUserData) => void;
  logout: () => void;
  setUser: (u: ClientUserData) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);
