import { useState, useCallback } from 'react'
import { updateUserRole } from '../../services/adminUsers'
import { updatePermissions, type RolePermission } from '../../services/permissions'
import { useAuth } from '../../contexts/AuthContext'
import { THEMES } from '../../App'
import styles from './AdminConfig.module.css'

const SHARE_LIMIT_OPTIONS: { label: string; hours: number | null }[] = [
  { label: 'Forbidden', hours: 0 },
  { label: '1h', hours: 1 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: 'No limit', hours: null },
]

interface AdminConfigProps {
  onBack: () => void
}

type ConfigTab = 'users' | 'permissions'

export default function AdminConfig({ onBack }: AdminConfigProps) {
  const { user: currentUser, adminUsers: users, adminUsersLoading: loading, adminUsersError: error, setAdminUsers, userRole, canEditPermissions, allPermissions, refetchPermissions } = useAuth()
  const [activeTab, setActiveTab] = useState<ConfigTab>('users')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [savingRoles, setSavingRoles] = useState<Set<string>>(new Set())
  const [localPerms, setLocalPerms] = useState<RolePermission[] | null>(null)
  const isManager = userRole === 'manager'

  // Use local edits if present, otherwise use context
  const permissions = localPerms ?? allPermissions

  const handleSetRole = useCallback(async (userId: string, newRole: 'admin' | 'manager' | null) => {
    setUpdatingIds((prev) => new Set(prev).add(userId))

    try {
      const updatedUsers = await updateUserRole(userId, newRole)
      setAdminUsers(updatedUsers)
    } catch {
      // role unchanged on failure
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }, [setAdminUsers])

  const handleToggleSource = useCallback((role: string, source: string, enabled: boolean) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => {
        if (p.role !== role) return p
        const sources = enabled
          ? [...p.allowed_sources, source]
          : p.allowed_sources.filter((s) => s !== source)
        return { ...p, allowed_sources: sources }
      })
    })
  }, [allPermissions])

  const handleSetShareLimit = useCallback((role: string, hours: number | null) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => p.role === role ? { ...p, max_share_hours: hours } : p)
    })
  }, [allPermissions])

  const handleToggleEditPerms = useCallback((role: string, value: boolean) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => p.role === role ? { ...p, can_edit_permissions: value } : p)
    })
  }, [allPermissions])

  const handleSavePermissions = useCallback(async (role: string) => {
    const perm = permissions.find((p) => p.role === role)
    if (!perm) return
    setSavingRoles((prev) => new Set(prev).add(role))
    try {
      await updatePermissions(role, perm.allowed_sources, perm.max_share_hours, perm.can_edit_permissions)
      refetchPermissions()
      setLocalPerms(null)
    } catch {
      // revert on failure
    } finally {
      setSavingRoles((prev) => {
        const next = new Set(prev)
        next.delete(role)
        return next
      })
    }
  }, [permissions, refetchPermissions])

  const hasChanges = (role: string) => {
    const local = permissions.find((p) => p.role === role)
    const original = allPermissions.find((p) => p.role === role)
    if (!local || !original) return false
    return (
      JSON.stringify(local.allowed_sources.slice().sort()) !== JSON.stringify(original.allowed_sources.slice().sort()) ||
      local.max_share_hours !== original.max_share_hours ||
      local.can_edit_permissions !== original.can_edit_permissions
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn} aria-label="Back to chat">
          <svg viewBox="0 0 20 20" width={18} height={18} fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
        </button>
        <div className={styles.configTabs}>
          <button
            className={`${styles.configTab} ${activeTab === 'users' ? styles.configTabActive : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          {permissions.length > 0 && (
            <button
              className={`${styles.configTab} ${activeTab === 'permissions' ? styles.configTabActive : ''}`}
              onClick={() => setActiveTab('permissions')}
            >
              Roles & Permissions
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'users' && (
          <>
            {loading && users.length === 0 && (
              <div className={styles.loadingState}>Loading users...</div>
            )}

            {error && users.length === 0 && (
              <div className={styles.errorState}>{error}</div>
            )}

            {!loading && users.length === 0 && (
              <div className={styles.emptyState}>No other users found</div>
            )}

            <div style={loading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
              {(() => {
                const selfUser = users.find((u) => u.id === currentUser?.id)
                const otherUsers = users.filter((u) => u.id !== currentUser?.id)

                const renderRow = (user: typeof users[0], isSelf: boolean) => (
                  <div key={user.id} className={styles.userRow}>
                    <div className={styles.userInfo}>
                      <div className={styles.userEmail}>
                        {user.email}
                        {isSelf && <span className={styles.youTag}>you</span>}
                      </div>
                    </div>
                    <div className={styles.roleTabs}>
                      <button
                        className={`${styles.roleTab} ${!user.user_role ? styles.roleTabActive : ''}`}
                        disabled={isSelf || updatingIds.has(user.id) || !user.user_role || (isManager && user.user_role === 'admin')}
                        onClick={() => handleSetRole(user.id, null)}
                      >
                        User
                      </button>
                      <button
                        className={`${styles.roleTab} ${user.user_role === 'manager' ? styles.roleTabActive : ''}`}
                        disabled={isSelf || updatingIds.has(user.id) || user.user_role === 'manager' || (isManager && user.user_role === 'admin')}
                        onClick={() => handleSetRole(user.id, 'manager')}
                      >
                        Manager
                      </button>
                      <button
                        className={`${styles.roleTab} ${user.user_role === 'admin' ? styles.roleTabActive : ''}`}
                        disabled={isSelf || updatingIds.has(user.id) || user.user_role === 'admin' || isManager}
                        onClick={() => handleSetRole(user.id, 'admin')}
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                )

                return (
                  <>
                    {selfUser && renderRow(selfUser, true)}
                    {otherUsers.map((user) => renderRow(user, false))}
                  </>
                )
              })()}
            </div>
          </>
        )}

        {activeTab === 'permissions' && (
          <div className={styles.permColumns}>
            {permissions.map((perm) => {
              const disabled = !canEditPermissions || (isManager && perm.role === 'admin')
              const saving = savingRoles.has(perm.role)
              const changed = hasChanges(perm.role)

              return (
                <div key={perm.role} className={`${styles.permColumn} ${disabled ? styles.disabledCol : ''}`}>
                  <div className={styles.permColHeader}>
                    <span className={styles.permColName}>
                      {perm.role.charAt(0).toUpperCase() + perm.role.slice(1)}
                    </span>
                    <button
                      className={styles.saveBtn}
                      onClick={() => handleSavePermissions(perm.role)}
                      disabled={saving || !changed}
                      style={changed ? undefined : { visibility: 'hidden' }}
                      aria-label="Save permissions"
                      title="Save"
                    >
                      <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M12.5 14H3.5a1 1 0 01-1-1V3a1 1 0 011-1h7l2.5 2.5V13a1 1 0 01-1 1z" />
                        <path d="M5.5 2v3h4V2" />
                        <rect x="4.5" y="9" width="7" height="4" rx="0.5" />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Themes</span>
                    <div className={styles.permPills}>
                      {THEMES.map((theme) => {
                        const source = theme.sources[0]
                        const active = perm.allowed_sources.includes(source)
                        return (
                          <button
                            key={source}
                            className={`${styles.permPill} ${active ? styles.permPillActive : ''}`}
                            onClick={() => handleToggleSource(perm.role, source, !active)}
                          >
                            {theme.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Share limit</span>
                    <div className={styles.permPills}>
                      {SHARE_LIMIT_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          className={`${styles.permPill} ${perm.max_share_hours === opt.hours ? styles.permPillActive : ''}`}
                          onClick={() => handleSetShareLimit(perm.role, opt.hours)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Edit perms</span>
                    <div className={styles.permPills}>
                      <button
                        className={`${styles.permPill} ${perm.can_edit_permissions ? styles.permPillActive : ''}`}
                        onClick={() => handleToggleEditPerms(perm.role, true)}
                      >
                        Yes
                      </button>
                      <button
                        className={`${styles.permPill} ${!perm.can_edit_permissions ? styles.permPillActive : ''}`}
                        onClick={() => handleToggleEditPerms(perm.role, false)}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
