import { createContext, useContext } from 'react';
import type { AdminMe } from '@/lib/api';

export const AdminRoleContext = createContext<AdminMe['role'] | null>(null);

export function useAdminRole(): AdminMe['role'] | null {
  return useContext(AdminRoleContext);
}
