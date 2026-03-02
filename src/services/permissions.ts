import { supabase } from '../lib/supabase'

export type AccessLevel = 'none' | 'view' | 'edit'

export interface RolePermission {
  role: string
  allowed_sources: string[]
  allowed_share_hours: number[]
  permissions_access: AccessLevel
  documents_access: AccessLevel
  suggestions_access: AccessLevel
  allowed_suggestions: string[]
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
  permissionsAccess: AccessLevel,
  documentsAccess: AccessLevel,
  suggestionsAccess: AccessLevel,
  allowedSuggestions: string[] = [],
): Promise<void> {
  const { error } = await supabase.rpc('update_role_permissions', {
    p_role: role,
    p_allowed_sources: allowedSources,
    p_allowed_share_hours: allowedShareHours,
    p_permissions_access: permissionsAccess,
    p_documents_access: documentsAccess,
    p_suggestions_access: suggestionsAccess,
    p_allowed_suggestions: allowedSuggestions,
  })
  if (error) throw error
}
