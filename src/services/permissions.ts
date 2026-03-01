import { supabase } from '../lib/supabase'

export interface RolePermission {
  role: string
  allowed_sources: string[]
  allowed_share_hours: number[]
  can_edit_permissions: boolean
}

export async function fetchAllPermissions(): Promise<RolePermission[]> {
  const { data, error } = await supabase.rpc('get_role_permissions')
  if (error) throw error
  return data ?? []
}

export async function updatePermissions(
  role: string,
  allowedSources: string[],
  allowedShareHours: number[],
  canEditPermissions: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('update_role_permissions', {
    p_role: role,
    p_allowed_sources: allowedSources,
    p_allowed_share_hours: allowedShareHours,
    p_can_edit_permissions: canEditPermissions,
  })
  if (error) throw error
}
