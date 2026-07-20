import type { Profile } from './types';

export type StaffRole = 'founder' | 'supreme_admin' | 'admin' | 'moderator' | 'user';

const ROLE_LEVEL: Record<StaffRole, number> = {
  founder: 5,
  supreme_admin: 4,
  admin: 3,
  moderator: 2,
  user: 1,
};

export function isFounder(role?: string | null): boolean {
  return role === 'founder';
}

export function isStaff(role?: string | null): boolean {
  return role === 'founder' || role === 'supreme_admin' || role === 'admin' || role === 'moderator';
}

export function isAdmin(role?: string | null): boolean {
  return role === 'founder' || role === 'supreme_admin' || role === 'admin';
}

export function isSupremeAdmin(role?: string | null): boolean {
  return role === 'founder' || role === 'supreme_admin';
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

export function canManageEconomy(role?: string | null): boolean {
  return isAdmin(role);
}

export function canManageConfig(role?: string | null): boolean {
  return isFounder(role);
}

export function canToggleMaintenance(role?: string | null): boolean {
  return isAdmin(role);
}

export function hasHigherRole(myRole: string, theirRole: string): boolean {
  return ROLE_LEVEL[myRole as StaffRole] > ROLE_LEVEL[theirRole as StaffRole];
}

export function canSuspendUser(myRole: string, targetProfile: Profile): boolean {
  if (!isStaff(myRole)) return false;
  if (targetProfile.role === 'founder') return false;
  if (targetProfile.role === 'supreme_admin' && !isFounder(myRole)) return false;
  if (targetProfile.role === 'admin' && !isSupremeAdmin(myRole)) return false;
  return true;
}

export function canChangeRole(myRole: string, _targetRole: string, _newRole: string): boolean {
  if (!isSupremeAdmin(myRole)) return false;
  return true;
}

export function canPromoteToAdmin(myRole: string): boolean {
  return isFounder(myRole);
}

export function canBypassMaintenance(role?: string | null): boolean {
  return isStaff(role);
}

export const ROLE_OPTIONS: { key: StaffRole; label: string }[] = [
  { key: 'user', label: 'Usuario' },
  { key: 'moderator', label: 'Moderador' },
  { key: 'admin', label: 'Admin' },
  { key: 'supreme_admin', label: 'Admin Supremo' },
  { key: 'founder', label: 'Fundador' },
];
