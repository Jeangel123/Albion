import type { Profile } from './types';

export type StaffRole = 'supreme_admin' | 'admin' | 'moderator' | 'user';

const ROLE_LEVEL: Record<StaffRole, number> = {
  supreme_admin: 4,
  admin: 3,
  moderator: 2,
  user: 1,
};

export function isStaff(role?: string | null): boolean {
  return role === 'supreme_admin' || role === 'admin' || role === 'moderator';
}

export function isAdmin(role?: string | null): boolean {
  return role === 'supreme_admin' || role === 'admin';
}

export function isSupremeAdmin(role?: string | null): boolean {
  return role === 'supreme_admin';
}

export function canModerate(role?: string | null): boolean {
  return isStaff(role);
}

export function canManageUsers(role?: string | null): boolean {
  return isAdmin(role);
}

export function canManageApp(role?: string | null): boolean {
  return isAdmin(role);
}

export function canViewAuditLog(role?: string | null): boolean {
  return isAdmin(role);
}

export function hasHigherRole(myRole: string, theirRole: string): boolean {
  return ROLE_LEVEL[myRole as StaffRole] > ROLE_LEVEL[theirRole as StaffRole];
}

export function canSuspendUser(myRole: string, targetProfile: Profile): boolean {
  if (!isStaff(myRole)) return false;
  if (targetProfile.role === 'supreme_admin') return false;
  if (targetProfile.role === 'admin' && myRole !== 'supreme_admin') return false;
  return true;
}

export function canChangeRole(myRole: string, targetRole: string, newRole: string): boolean {
  if (!isSupremeAdmin(myRole)) return false;
  return true;
}
