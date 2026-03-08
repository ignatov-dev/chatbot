import { useState, useMemo, useCallback, useRef, useEffect, type ChangeEvent } from 'react'
import { updateUserRole } from '../../services/adminUsers'
import { fetchFeedbackAnalytics, type FeedbackAnalytics } from '../../services/feedback'
import { updatePermissions, type RolePermission, type AccessLevel } from '../../services/permissions'
import { ingestDocument, deleteDocument, formatDocument, splitIntoChunks, type PreviewChunk } from '../../services/documents'
import { createSuggestion, updateSuggestion, deleteSuggestion } from '../../services/suggestions'
import { createAutocompleteSuggestion, updateAutocompleteSuggestion, deleteAutocompleteSuggestion } from '../../services/autocompleteSuggestions'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmDialog from '../ConfirmDialog'
import styles from './AdminConfig.module.css'

const SHARE_OPTIONS: { label: string; hours: number }[] = [
  { label: '1 Hour', hours: 1 },
  { label: '12 Hours', hours: 12 },
  { label: '24 Hours', hours: 24 },
  { label: 'No limit', hours: 0 },
]

interface AdminConfigProps {
  onBack: () => void
}

type ConfigTab = 'users' | 'permissions' | 'documents' | 'suggestions' | 'autocomplete' | 'feedback'

export default function AdminConfig({ onBack }: AdminConfigProps) {
  const { user: currentUser, adminUsers: users, adminUsersLoading: loading, adminUsersError: error, setAdminUsers, userRole, permissionsAccess, documentsAccess, suggestionsAccess, autocompleteAccess, rolesAccess, feedbackAccess, allPermissions, refetchPermissions, allSources, refetchSources, allSuggestions, refetchSuggestions, refetchMySuggestions, allAutocompleteSuggestions, refetchAutocompleteSuggestions, refetchMyAutocompleteSuggestions } = useAuth()
  const [activeTab, setActiveTab] = useState<ConfigTab>('users')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [localPerms, setLocalPerms] = useState<RolePermission[] | null>(null)
  const isManager = userRole === 'manager'

  // Set initial tab to the first one the user has access to
  const initialTabSet = useRef(false)
  useEffect(() => {
    if (initialTabSet.current) return
    const tabs: { key: ConfigTab; access: string }[] = [
      { key: 'users', access: rolesAccess },
      { key: 'permissions', access: permissionsAccess },
      { key: 'documents', access: documentsAccess },
      { key: 'suggestions', access: suggestionsAccess },
      { key: 'autocomplete', access: autocompleteAccess },
      { key: 'feedback', access: feedbackAccess },
    ]
    const first = tabs.find((t) => t.access !== 'none')
    if (first) {
      setActiveTab(first.key)
      initialTabSet.current = true
    }
  }, [rolesAccess, permissionsAccess, documentsAccess, suggestionsAccess, autocompleteAccess, feedbackAccess])

  // Users tab state
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users
    const q = userSearchQuery.toLowerCase()
    return users.filter((u) => u.email.toLowerCase().includes(q))
  }, [users, userSearchQuery])
  const usersByRole = useMemo(() => ({
    user: filteredUsers.filter((u) => !u.user_role),
    manager: filteredUsers.filter((u) => u.user_role === 'manager'),
    admin: filteredUsers.filter((u) => u.user_role === 'admin'),
  }), [filteredUsers])

  // Documents tab state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadContent, setUploadContent] = useState<string | null>(null)
  const [uploadPreviewChunks, setUploadPreviewChunks] = useState<PreviewChunk[] | null>(null)
  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [isFormatting, setIsFormatting] = useState(false)
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set())
  const [editingChunk, setEditingChunk] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [deleteSource, setDeleteSource] = useState<string | null>(null)
  const [deletingSource, setDeletingSource] = useState<string | null>(null)

  // Suggestions tab state
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null)
  const [editingSuggestionText, setEditingSuggestionText] = useState('')
  const [confirmDeleteSuggestion, setConfirmDeleteSuggestion] = useState<string | null>(null)

  // Autocomplete tab state
  const [editingAutocompleteId, setEditingAutocompleteId] = useState<string | null>(null)
  const [editingAutocompleteQuestion, setEditingAutocompleteQuestion] = useState('')
  const [editingAutocompleteKeywords, setEditingAutocompleteKeywords] = useState<string[]>([])
  const [editKeywordInput, setEditKeywordInput] = useState('')
  const [confirmDeleteAutocomplete, setConfirmDeleteAutocomplete] = useState<string | null>(null)

  // Feedback tab state
  const [feedbackData, setFeedbackData] = useState<FeedbackAnalytics | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackRange, setFeedbackRange] = useState<'7d' | '30d' | 'all'>('30d')

  useEffect(() => {
    if (activeTab !== 'feedback') return
    setFeedbackLoading(true)
    const from = feedbackRange === 'all'
      ? new Date(0).toISOString()
      : feedbackRange === '7d'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    fetchFeedbackAnalytics(from)
      .then(setFeedbackData)
      .catch(console.error)
      .finally(() => setFeedbackLoading(false))
  }, [activeTab, feedbackRange])

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

  const handleToggleShareHours = useCallback((role: string, hours: number, enabled: boolean) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => {
        if (p.role !== role) return p
        const list = enabled
          ? [...p.allowed_share_hours, hours]
          : p.allowed_share_hours.filter((h) => h !== hours)
        return { ...p, allowed_share_hours: list }
      })
    })
  }, [allPermissions])

  const handleSetAccess = useCallback((role: string, field: 'permissions_access' | 'documents_access' | 'suggestions_access' | 'autocomplete_access' | 'roles_access' | 'feedback_access', value: AccessLevel) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => p.role === role ? { ...p, [field]: value } : p)
    })
  }, [allPermissions])

  const [savingAll, setSavingAll] = useState(false)
  const handleSaveAllPermissions = useCallback(async () => {
    // Save all roles that have local edits
    const changedRoles = permissions.filter((perm) => {
      const original = allPermissions.find((p) => p.role === perm.role)
      if (!original) return false
      return JSON.stringify(perm) !== JSON.stringify(original)
    })
    if (changedRoles.length === 0) return
    setSavingAll(true)
    try {
      await Promise.all(changedRoles.map((perm) =>
        updatePermissions(perm.role, perm.allowed_sources, perm.allowed_share_hours, perm.permissions_access ?? 'none', perm.documents_access ?? 'none', perm.suggestions_access ?? 'none', perm.allowed_suggestions ?? [], perm.autocomplete_access ?? 'none', perm.allowed_autocomplete ?? [], perm.roles_access ?? 'none', perm.feedback_access ?? 'none')
      ))
      await refetchPermissions()
      setLocalPerms(null)
    } catch {
      // revert on failure
    } finally {
      setSavingAll(false)
    }
  }, [permissions, allPermissions, refetchPermissions])

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.name.endsWith('.txt')) return
    setIngestError(null)
    setUploadFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      setUploadContent(text)
      setUploadPreviewChunks(splitIntoChunks(text))
      setExpandedChunks(new Set())
    }
    reader.readAsText(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }, [])

  const handleCancelUpload = useCallback(() => {
    setUploadFile(null)
    setUploadContent(null)
    setUploadPreviewChunks(null)
    setIngestError(null)
  }, [])

  const handleConfirmUpload = useCallback(async () => {
    if (!uploadFile || !uploadContent) return
    setIsIngesting(true)
    setIngestError(null)
    try {
      const alreadyExists = allSources.includes(uploadFile.name)
      await ingestDocument(uploadFile.name, uploadContent, alreadyExists)
      setUploadFile(null)
      setUploadContent(null)
      setUploadPreviewChunks(null)
      await refetchSources()
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsIngesting(false)
    }
  }, [uploadFile, uploadContent, allSources, refetchSources])

  const handleDeleteChunk = useCallback((index: number) => {
    setUploadPreviewChunks((prev) => prev ? prev.filter((_, i) => i !== index) : prev)
    setExpandedChunks((prev) => {
      const next = new Set<number>()
      prev.forEach((idx) => { if (idx < index) next.add(idx); else if (idx > index) next.add(idx - 1) })
      return next
    })
  }, [])

  const handleToggleChunk = useCallback((index: number) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index); else next.add(index)
      return next
    })
  }, [])

  const handleStartEdit = useCallback((index: number, content: string) => {
    setEditingChunk(index)
    setEditingContent(content)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingChunk === null) return
    const idx = editingChunk
    setUploadPreviewChunks((prev) => prev ? prev.map((c, i) => i === idx ? { ...c, content: editingContent } : c) : prev)
    setEditingChunk(null)
    setEditingContent('')
  }, [editingChunk, editingContent])

  const handleCancelEdit = useCallback(() => {
    setEditingChunk(null)
    setEditingContent('')
  }, [])

  const handleFormatWithAI = useCallback(async () => {
    if (!uploadContent) return
    setIsFormatting(true)
    setIngestError(null)
    try {
      const formatted = await formatDocument(uploadContent)
      setUploadContent(formatted)
      setUploadPreviewChunks(splitIntoChunks(formatted))
      setExpandedChunks(new Set())
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Formatting failed')
    } finally {
      setIsFormatting(false)
    }
  }, [uploadContent])

  const handleDeleteDocument = useCallback(async (source: string) => {
    setDeletingSource(source)
    try {
      await deleteDocument(source)
      await refetchSources()
    } catch {
      // deletion failed silently
    } finally {
      setDeletingSource(null)
      setDeleteSource(null)
    }
  }, [refetchSources])

  const handleAddSuggestion = useCallback(async () => {
    if (!editingSuggestionText.trim()) return
    try {
      await createSuggestion(editingSuggestionText.trim())
      setEditingSuggestionId(null)
      setEditingSuggestionText('')
      await refetchSuggestions()
      await refetchMySuggestions()
    } catch {
      // add failed
    }
  }, [editingSuggestionText, refetchSuggestions, refetchMySuggestions])

  const handleSaveEditSuggestion = useCallback(async () => {
    if (!editingSuggestionId || !editingSuggestionText.trim()) return
    try {
      await updateSuggestion(editingSuggestionId, editingSuggestionText.trim())
      setEditingSuggestionId(null)
      setEditingSuggestionText('')
      await refetchSuggestions()
      await refetchMySuggestions()
    } catch {
      // edit failed
    }
  }, [editingSuggestionId, editingSuggestionText, refetchSuggestions, refetchMySuggestions])

  const handleDeleteSuggestion = useCallback(async (id: string) => {
    try {
      await deleteSuggestion(id)
      await refetchSuggestions()
      await refetchMySuggestions()
    } catch {
      // deletion failed
    } finally {
      setConfirmDeleteSuggestion(null)
      setEditingSuggestionId(null)
      setEditingSuggestionText('')
    }
  }, [refetchSuggestions, refetchMySuggestions])

  const handleAddAutocomplete = useCallback(async () => {
    if (!editingAutocompleteQuestion.trim()) return
    try {
      await createAutocompleteSuggestion(editingAutocompleteQuestion.trim(), editingAutocompleteKeywords)
      setEditingAutocompleteId(null)
      setEditingAutocompleteQuestion('')
      setEditingAutocompleteKeywords([])
      setEditKeywordInput('')
      await refetchAutocompleteSuggestions()
      await refetchMyAutocompleteSuggestions()
    } catch {
      // add failed
    }
  }, [editingAutocompleteQuestion, editingAutocompleteKeywords, refetchAutocompleteSuggestions, refetchMyAutocompleteSuggestions])

  const handleSaveEditAutocomplete = useCallback(async () => {
    if (!editingAutocompleteId || !editingAutocompleteQuestion.trim()) return
    try {
      await updateAutocompleteSuggestion(editingAutocompleteId, editingAutocompleteQuestion.trim(), editingAutocompleteKeywords)
      setEditingAutocompleteId(null)
      setEditingAutocompleteQuestion('')
      setEditingAutocompleteKeywords([])
      setEditKeywordInput('')
      await refetchAutocompleteSuggestions()
      await refetchMyAutocompleteSuggestions()
    } catch {
      // edit failed
    }
  }, [editingAutocompleteId, editingAutocompleteQuestion, editingAutocompleteKeywords, refetchAutocompleteSuggestions, refetchMyAutocompleteSuggestions])

  const handleDeleteAutocomplete = useCallback(async (id: string) => {
    try {
      await deleteAutocompleteSuggestion(id)
      await refetchAutocompleteSuggestions()
      await refetchMyAutocompleteSuggestions()
    } catch {
      // deletion failed
    } finally {
      setConfirmDeleteAutocomplete(null)
      setEditingAutocompleteId(null)
      setEditingAutocompleteQuestion('')
      setEditingAutocompleteKeywords([])
      setEditKeywordInput('')
    }
  }, [refetchAutocompleteSuggestions, refetchMyAutocompleteSuggestions])

  const handleToggleAutocomplete = useCallback((role: string, autocompleteId: string, enabled: boolean) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => {
        if (p.role !== role) return p
        const autocomplete = enabled
          ? [...(p.allowed_autocomplete ?? []), autocompleteId]
          : (p.allowed_autocomplete ?? []).filter((id) => id !== autocompleteId)
        return { ...p, allowed_autocomplete: autocomplete }
      })
    })
  }, [allPermissions])

  const handleToggleSuggestion = useCallback((role: string, suggestionId: string, enabled: boolean) => {
    setLocalPerms((prev) => {
      const base = prev ?? allPermissions
      return base.map((p) => {
        if (p.role !== role) return p
        const suggestions = enabled
          ? [...(p.allowed_suggestions ?? []), suggestionId]
          : (p.allowed_suggestions ?? []).filter((id) => id !== suggestionId)
        return { ...p, allowed_suggestions: suggestions }
      })
    })
  }, [allPermissions])

  const hasChanges = (role: string) => {
    const local = permissions.find((p) => p.role === role)
    const original = allPermissions.find((p) => p.role === role)
    if (!local || !original) return false
    return (
      JSON.stringify(local.allowed_sources.slice().sort()) !== JSON.stringify(original.allowed_sources.slice().sort()) ||
      JSON.stringify(local.allowed_share_hours.slice().sort()) !== JSON.stringify(original.allowed_share_hours.slice().sort()) ||
      local.permissions_access !== original.permissions_access ||
      local.documents_access !== original.documents_access ||
      local.suggestions_access !== original.suggestions_access ||
      JSON.stringify((local.allowed_suggestions ?? []).slice().sort()) !== JSON.stringify((original.allowed_suggestions ?? []).slice().sort()) ||
      local.autocomplete_access !== original.autocomplete_access ||
      JSON.stringify((local.allowed_autocomplete ?? []).slice().sort()) !== JSON.stringify((original.allowed_autocomplete ?? []).slice().sort()) ||
      local.roles_access !== original.roles_access ||
      local.feedback_access !== original.feedback_access
    )
  }

  const hasAnyChanges = permissions.some((p) => hasChanges(p.role))

  // Warn on browser reload / tab close when there are unsaved changes
  useEffect(() => {
    if (!hasAnyChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasAnyChanges])

  // Unsaved changes confirm dialog state
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const guardUnsavedChanges = useCallback((action: () => void) => {
    if (hasAnyChanges) {
      setPendingAction(() => action)
    } else {
      action()
    }
  }, [hasAnyChanges])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => guardUnsavedChanges(onBack)} className={styles.backBtn} aria-label="Back to chat">
          <svg viewBox="0 0 20 20" width={18} height={18} fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
        </button>
        <div className={styles.configTabs}>
          {rolesAccess !== 'none' && (
            <button
              className={`${styles.configTab} ${activeTab === 'users' ? styles.configTabActive : ''}`}
              onClick={() => guardUnsavedChanges(() => setActiveTab('users'))}
            >
              Roles
            </button>
          )}
          {permissionsAccess !== 'none' && permissions.length > 0 && (
            <button
              className={`${styles.configTab} ${activeTab === 'permissions' ? styles.configTabActive : ''}`}
              onClick={() => guardUnsavedChanges(() => setActiveTab('permissions'))}
            >
              Permissions
            </button>
          )}
          {documentsAccess !== 'none' && (
            <button
              className={`${styles.configTab} ${activeTab === 'documents' ? styles.configTabActive : ''}`}
              onClick={() => guardUnsavedChanges(() => setActiveTab('documents'))}
            >
              Documents
            </button>
          )}
          {suggestionsAccess !== 'none' && (
            <button
              className={`${styles.configTab} ${activeTab === 'suggestions' ? styles.configTabActive : ''}`}
              onClick={() => guardUnsavedChanges(() => setActiveTab('suggestions'))}
            >
              Suggestions
            </button>
          )}
          {autocompleteAccess !== 'none' && (
            <button
              className={`${styles.configTab} ${activeTab === 'autocomplete' ? styles.configTabActive : ''}`}
              onClick={() => guardUnsavedChanges(() => setActiveTab('autocomplete'))}
            >
              Autocomplete
            </button>
          )}
          {feedbackAccess !== 'none' && (
            <button
              className={`${styles.configTab} ${activeTab === 'feedback' ? styles.configTabActive : ''}`}
              onClick={() => guardUnsavedChanges(() => setActiveTab('feedback'))}
            >
              Analytics
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

            {users.length > 0 && (
              <div className={styles.userSearchWrapper}>
                <svg className={styles.userSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  className={styles.userSearchInput}
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
                {userSearchQuery && (
                  <button className={styles.userSearchClear} onClick={() => setUserSearchQuery('')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            )}

            <div className={styles.permColumns} style={loading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
              {(['admin', 'manager', 'user'] as const).map((role) => (
                <div key={role} className={styles.permColumn}>
                  <span className={styles.permColName}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                  <span style={{ visibility: 'hidden' }} className={styles.saveBtn}>-</span>
                  {usersByRole[role].map((user) => {
                    const isSelf = user.id === currentUser?.id
                    return (
                      <div key={user.id} className={styles.toggleRow}>
                        <button
                          type="button"
                          className={rolesAccess === 'edit' ? styles.toggleLabelLink : styles.toggleLabel}
                          onClick={() => {
                            if (rolesAccess === 'edit') setEditingUserId(user.id)
                          }}
                          style={rolesAccess !== 'edit' ? { cursor: 'default' } : undefined}
                        >
                          {user.email}
                          {isSelf && <span className={styles.youTag}>you</span>}
                        </button>
                      </div>
                    )
                  })}
                  {usersByRole[role].length === 0 && (
                    <div className={styles.emptyState} style={{ padding: '12px 0' }}>No users</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'permissions' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                className={styles.saveChangesChip}
                onClick={handleSaveAllPermissions}
                disabled={savingAll || !hasAnyChanges}
                style={hasAnyChanges ? undefined : { opacity: 0.6 }}
              >
                {savingAll ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          <div className={styles.permColumns}>
            {permissions.map((perm) => {
              const isSelfRole = perm.role === (userRole ?? 'user') && userRole !== 'admin'
              const disabled = isSelfRole || permissionsAccess !== 'edit' || (isManager && perm.role === 'admin')

              const ACCESS_OPTIONS: { value: AccessLevel; label: string }[] = [
                { value: 'none', label: 'None' },
                { value: 'view', label: 'View' },
                { value: 'edit', label: 'Edit' },
              ]

              const renderAccessSwitcher = (field: 'permissions_access' | 'documents_access' | 'suggestions_access' | 'autocomplete_access' | 'roles_access' | 'feedback_access') => {
                const isProtected = perm.role === 'admin' && field === 'permissions_access'
                return (
                  <div className={styles.accessSwitcher}>
                    {ACCESS_OPTIONS.map((opt, i) => (
                      <span key={opt.value} style={{ display: 'contents' }}>
                        {i > 0 && <span className={styles.accessSeparator}>|</span>}
                        <button
                          className={`${styles.accessOption} ${perm[field] === opt.value ? styles.accessOptionActive : ''}`}
                          disabled={disabled || (isProtected && opt.value !== 'edit')}
                          onClick={() => handleSetAccess(perm.role, field, opt.value)}
                        >
                          {opt.label}
                        </button>
                      </span>
                    ))}
                  </div>
                )
              }

              return (
                <div key={perm.role} className={styles.permColumn}>
                  <span className={styles.permColName}>
                    {perm.role.charAt(0).toUpperCase() + perm.role.slice(1)}
                  </span>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Tab access</span>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>ROLES</span>
                      {renderAccessSwitcher('roles_access')}
                    </div>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>PERMISSIONS</span>
                      {renderAccessSwitcher('permissions_access')}
                    </div>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>DOCUMENTS</span>
                      {renderAccessSwitcher('documents_access')}
                    </div>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>SUGGESTIONS</span>
                      {renderAccessSwitcher('suggestions_access')}
                    </div>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>AUTOCOMPLETE</span>
                      {renderAccessSwitcher('autocomplete_access')}
                    </div>
                    <div className={styles.toggleRow}>
                      <span className={styles.toggleLabel}>ANALYTICS</span>
                      {renderAccessSwitcher('feedback_access')}
                    </div>
                  </div>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Document access</span>
                    {allSources.map((source) => {
                      const active = perm.allowed_sources.includes(source)
                      return (
                        <div key={source} className={styles.toggleRow}>
                          <span className={styles.toggleLabel}>{source}</span>
                          <label className={styles.toggleSwitch}>
                            <input
                              type="checkbox"
                              checked={active}
                              disabled={disabled}
                              onChange={() => handleToggleSource(perm.role, source, !active)}
                            />
                            <span className={styles.toggleTrack} />
                            <span className={styles.toggleThumb} />
                          </label>
                        </div>
                      )
                    })}
                  </div>

                  <div className={styles.permGroup}>
                    <span className={styles.permGroupLabel}>Share options</span>
                    {SHARE_OPTIONS.map((opt) => {
                      const active = perm.allowed_share_hours.includes(opt.hours)
                      return (
                        <div key={opt.label} className={styles.toggleRow}>
                          <span className={styles.toggleLabel}>{opt.label}</span>
                          <label className={styles.toggleSwitch}>
                            <input
                              type="checkbox"
                              checked={active}
                              disabled={disabled}
                              onChange={() => handleToggleShareHours(perm.role, opt.hours, !active)}
                            />
                            <span className={styles.toggleTrack} />
                            <span className={styles.toggleThumb} />
                          </label>
                        </div>
                      )
                    })}
                  </div>

                </div>
              )
            })}
          </div>
          </>
        )}

        {activeTab === 'documents' && (
          <>
            {documentsAccess === 'edit' && (
              <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  className={styles.fileInput}
                  onChange={handleFileSelect}
                />
                <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
                <span>Click to upload a .txt document</span>
              </div>
            )}

            {ingestError && (
              <div className={styles.errorState} style={{ padding: '12px 0' }}>{ingestError}</div>
            )}

            {allSources.length === 0 && (
              <div className={styles.emptyState}>No documents ingested yet</div>
            )}

            {allSources.map((source) => (
              <div key={source} className={styles.sourceRow}>
                <span className={styles.sourceName}>{source}</span>
                {documentsAccess === 'edit' && (
                  <button
                    className={styles.sourceDeleteBtn}
                    disabled={deletingSource === source}
                    onClick={() => setDeleteSource(source)}
                    aria-label={`Delete ${source}`}
                  >
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {activeTab === 'suggestions' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
              {suggestionsAccess === 'edit' && (
                <button
                  className={styles.addQuestionChip}
                  onClick={() => {
                    setEditingSuggestionId('new')
                    setEditingSuggestionText('')
                  }}
                >
                  + New suggestion
                </button>
              )}
              <button
                className={styles.saveChangesChip}
                onClick={handleSaveAllPermissions}
                disabled={savingAll || !hasAnyChanges}
                style={hasAnyChanges ? undefined : { opacity: 0.6 }}
              >
                {savingAll ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            {allSuggestions.length === 0 && (
              <div className={styles.emptyState}>No suggestions yet</div>
            )}

            {allSuggestions.length > 0 && permissions.length > 0 && (
              <div className={styles.permColumns}>
                {permissions.map((perm) => {
                  const disabled = permissionsAccess !== 'edit' || (isManager && perm.role === 'admin')

                  return (
                    <div key={perm.role} className={styles.permColumn}>
                      <span className={styles.permColName}>
                        {perm.role.charAt(0).toUpperCase() + perm.role.slice(1)}
                      </span>

                      {allSuggestions.map((s) => {
                        const active = (perm.allowed_suggestions ?? []).includes(s.id)
                        return (
                          <div key={s.id} className={styles.toggleRow}>
                            <button
                              type="button"
                              className={suggestionsAccess === 'edit' ? styles.toggleLabelLink : styles.toggleLabel}
                              onClick={() => {
                                if (suggestionsAccess === 'edit') {
                                  setEditingSuggestionId(s.id)
                                  setEditingSuggestionText(s.text)
                                }
                              }}
                              style={suggestionsAccess !== 'edit' ? { cursor: 'default' } : undefined}
                            >
                              {s.text}
                            </button>
                            <label className={styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={active}
                                disabled={disabled}
                                onChange={() => handleToggleSuggestion(perm.role, s.id, !active)}
                              />
                              <span className={styles.toggleTrack} />
                              <span className={styles.toggleThumb} />
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'autocomplete' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
              {autocompleteAccess === 'edit' && (
                <button
                  className={styles.addQuestionChip}
                  onClick={() => {
                    setEditingAutocompleteId('new')
                    setEditingAutocompleteQuestion('')
                    setEditingAutocompleteKeywords([])
                    setEditKeywordInput('')
                  }}
                >
                  + New question
                </button>
              )}
              <button
                className={styles.saveChangesChip}
                onClick={handleSaveAllPermissions}
                disabled={savingAll || !hasAnyChanges}
                style={hasAnyChanges ? undefined : { opacity: 0.6 }}
              >
                {savingAll ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            {allAutocompleteSuggestions.length === 0 && (
              <div className={styles.emptyState}>No autocomplete suggestions yet</div>
            )}

            {allAutocompleteSuggestions.length > 0 && permissions.length > 0 && (
              <div className={styles.permColumns}>
                {permissions.map((perm) => {
                  const disabled = permissionsAccess !== 'edit' || (isManager && perm.role === 'admin')

                  return (
                    <div key={perm.role} className={styles.permColumn}>
                      <span className={styles.permColName}>
                        {perm.role.charAt(0).toUpperCase() + perm.role.slice(1)}
                      </span>

                      {allAutocompleteSuggestions.map((s) => {
                        const active = (perm.allowed_autocomplete ?? []).includes(s.id)
                        return (
                          <div key={s.id} className={styles.toggleRow}>
                            <button
                              type="button"
                              className={autocompleteAccess === 'edit' ? styles.toggleLabelLink : styles.toggleLabel}
                              onClick={() => {
                                if (autocompleteAccess === 'edit') {
                                  setEditingAutocompleteId(s.id)
                                  setEditingAutocompleteQuestion(s.question)
                                  setEditingAutocompleteKeywords([...s.keywords])
                                  setEditKeywordInput('')
                                }
                              }}
                              style={autocompleteAccess !== 'edit' ? { cursor: 'default' } : undefined}
                            >
                              {s.question}
                            </button>
                            <label className={styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={active}
                                disabled={disabled}
                                onChange={() => handleToggleAutocomplete(perm.role, s.id, !active)}
                              />
                              <span className={styles.toggleTrack} />
                              <span className={styles.toggleThumb} />
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'feedback' && (
          <>
            {/* Date range pills */}
            <div className={styles.feedbackRangePills}>
              {(['7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  className={`${styles.feedbackRangePill} ${feedbackRange === r ? styles.feedbackRangePillActive : ''}`}
                  onClick={() => setFeedbackRange(r)}
                >
                  {r === '7d' ? '7 days' : r === '30d' ? '30 days' : 'All time'}
                </button>
              ))}
            </div>

            {feedbackLoading && <div className={styles.loadingState}>Loading feedback...</div>}

            {!feedbackLoading && feedbackData && feedbackData.total > 0 && (() => {
              const satisfaction = feedbackData.total > 0
                ? Math.round((feedbackData.thumbs_up / feedbackData.total) * 100)
                : 0
              const ringColor = satisfaction < 30 ? '#ef4444' : satisfaction < 80 ? '#f59e0b' : '#059669'
              const totalReasons = Object.values(feedbackData.reasons ?? {}).reduce((a, b) => a + b, 0)
              return (
                <>
                  {/* Hero: Satisfaction ring + stat cards */}
                  <div className={styles.feedbackHero}>
                    <div className={styles.satisfactionRingCard}>
                      <div
                        className={styles.satisfactionRing}
                        style={{
                          background: `conic-gradient(${ringColor} 0% ${satisfaction}%, #f3f4f6 ${satisfaction}% 100%)`,
                        }}
                      >
                        <div className={styles.satisfactionRingInner}>
                          <span className={styles.satisfactionRingValue}>{satisfaction}</span>
                          <span className={styles.satisfactionRingUnit}>%</span>
                        </div>
                      </div>
                      <span className={styles.satisfactionRingLabel}>Satisfaction Rate</span>
                    </div>

                    <div className={styles.feedbackStats}>
                      <div className={styles.feedbackStatCard} data-accent="purple">
                        <span className={styles.feedbackStatLabel}>Total</span>
                        <span className={styles.feedbackStatValue}>{feedbackData.total}</span>
                        <div className={styles.feedbackStatIcon} data-accent="purple">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </div>
                      </div>
                      <div className={styles.feedbackStatCard} data-accent="green">
                        <span className={styles.feedbackStatLabel}>Positive</span>
                        <span className={styles.feedbackStatValue}>{feedbackData.thumbs_up}</span>
                        <div className={styles.feedbackStatIcon} data-accent="green">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
                        </div>
                      </div>
                      <div className={styles.feedbackStatCard} data-accent="red">
                        <span className={styles.feedbackStatLabel}>Negative</span>
                        <span className={styles.feedbackStatValue}>{feedbackData.thumbs_down}</span>
                        <div className={styles.feedbackStatIcon} data-accent="red">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Negative feedback reasons */}
                  {feedbackData.thumbs_down > 0 && feedbackData.reasons && Object.keys(feedbackData.reasons).length > 0 && (
                    <div className={styles.feedbackReasonsSection}>
                      <div className={styles.feedbackSectionTitle}>
                        <span className={styles.feedbackSectionTitleIcon} style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </span>
                        Negative Feedback Reasons
                      </div>
                      {Object.entries(feedbackData.reasons)
                        .sort(([, a], [, b]) => b - a)
                        .map(([reason, count]) => {
                          const maxCount = Math.max(...Object.values(feedbackData.reasons))
                          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                          const pctOfTotal = totalReasons > 0 ? Math.round((count / totalReasons) * 100) : 0
                          const label = reason.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
                          return (
                            <div key={reason} className={styles.reasonBar}>
                              <span className={styles.reasonLabel}>{label}</span>
                              <div className={styles.reasonTrack}>
                                <div className={styles.reasonFill} data-reason={reason} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={styles.reasonCount}>{count}</span>
                              <span className={styles.reasonPct}>{pctOfTotal}%</span>
                            </div>
                          )
                        })}
                    </div>
                  )}

                  {/* Recent negative feedback */}
                  {feedbackData.recent_negative && feedbackData.recent_negative.length > 0 && (
                    <div className={styles.feedbackNegativeSection}>
                      <div className={styles.feedbackSectionTitle}>
                        <span className={styles.feedbackSectionTitleIcon} style={{ background: 'rgba(79, 45, 208, 0.08)', color: '#4f2dd0' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </span>
                        Recent Negative Feedback
                      </div>
                      {feedbackData.recent_negative.map((item, i) => (
                        <div key={i} className={styles.feedbackItem}>
                          <div className={styles.feedbackItemContent}>
                            {item.content.length > 200 ? item.content.slice(0, 200) + '...' : item.content}
                          </div>
                          <div className={styles.feedbackItemMeta}>
                            <svg className={styles.feedbackItemIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
                            {item.reasons && item.reasons.map((r: string) => (
                              <span key={r} className={styles.feedbackReason} data-reason={r}>
                                {r.replace(/_/g, ' ')}
                              </span>
                            ))}
                            <span className={styles.feedbackItemDate}>
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}

            {!feedbackLoading && feedbackData && feedbackData.total === 0 && (
              <div className={styles.feedbackEmpty}>
                <svg className={styles.feedbackEmptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <div className={styles.feedbackEmptyText}>No feedback collected yet</div>
                <div className={styles.feedbackEmptySub}>Feedback will appear here once users rate responses</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload preview popup */}
      {uploadPreviewChunks && uploadFile && (
        <div className={styles.previewOverlay} onClick={(e) => { if (e.target === e.currentTarget && !isIngesting) handleCancelUpload() }}>
          <div className={styles.previewDialog}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitle}>{uploadFile.name}</div>
              <div className={styles.previewMeta}>{uploadPreviewChunks.length} chunk{uploadPreviewChunks.length !== 1 ? 's' : ''}</div>
              <button
                className={styles.formatBtn}
                onClick={handleFormatWithAI}
                disabled={isFormatting || isIngesting}
              >
                {isFormatting ? 'Formatting...' : (<>Format <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} style={{ verticalAlign: 'middle', marginLeft: 2 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg></>)}
              </button>
            </div>
            <div className={styles.previewChunkList}>
              {uploadPreviewChunks.map((chunk, i) => (
                <div key={i} className={styles.previewChunk}>
                  <div className={styles.chunkHeader}>
                    <span className={styles.chunkTitle}>{chunk.title}</span>
                    <button
                      className={styles.chunkEditBtn}
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(i, chunk.content) }}
                      disabled={isIngesting}
                      aria-label={`Edit chunk`}
                    >
                      <svg viewBox="0 0 20 20" width={14} height={14} fill="currentColor">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                    <button
                      className={styles.chunkDeleteBtn}
                      onClick={(e) => { e.stopPropagation(); handleDeleteChunk(i) }}
                      disabled={isIngesting}
                      aria-label={`Delete chunk`}
                    >
                      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {editingChunk === i ? (
                    <div className={styles.chunkEditArea}>
                      <textarea
                        className={styles.chunkTextarea}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                      />
                      <div className={styles.chunkEditActions}>
                        <button className={styles.chunkEditCancel} onClick={handleCancelEdit}>Cancel</button>
                        <button className={styles.chunkEditSave} onClick={handleSaveEdit}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <span className={styles.chunkText} onClick={() => handleToggleChunk(i)}>
                      {expandedChunks.has(i) ? chunk.content : chunk.content.length > 200 ? chunk.content.slice(0, 200) + '...' : chunk.content}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {ingestError && (
              <div className={styles.errorState} style={{ padding: '8px 0 0', textAlign: 'left' }}>{ingestError}</div>
            )}
            <div className={styles.previewActions}>
              <button className={styles.cancelBtn} onClick={handleCancelUpload} disabled={isIngesting}>
                Cancel
              </button>
              <button className={styles.publishBtn} onClick={handleConfirmUpload} disabled={isIngesting}>
                {isIngesting ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete document confirmation */}
      {deleteSource && (
        <ConfirmDialog
          title="Delete document"
          message={`All chunks for "${deleteSource}" will be permanently deleted. This cannot be undone.`}
          onConfirm={() => handleDeleteDocument(deleteSource)}
          onCancel={() => setDeleteSource(null)}
        />
      )}

      {/* Add/Edit autocomplete suggestion popup */}
      {editingAutocompleteId && autocompleteAccess === 'edit' && (
        <div className={styles.autocompletePopupOverlay} onClick={() => { setEditingAutocompleteId(null); setEditingAutocompleteQuestion(''); setEditingAutocompleteKeywords([]); setEditKeywordInput('') }}>
          <div className={styles.autocompletePopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.autocompletePopupHeader}>
              <span className={styles.autocompletePopupTitle}>{editingAutocompleteId === 'new' ? 'New suggestion' : 'Edit suggestion'}</span>
            </div>
            <div className={styles.autocompletePopupBody}>
              <div>
                <div className={styles.autocompleteFieldLabel}>Question</div>
                <input
                  type="text"
                  className={styles.suggestionInput}
                  value={editingAutocompleteQuestion}
                  onChange={(e) => setEditingAutocompleteQuestion(e.target.value)}
                  placeholder="Question..."
                  autoFocus
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <div className={styles.autocompleteFieldLabel}>Keywords</div>
                <div
                  className={styles.tagInputWrapper}
                  onClick={(e) => { (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}
                >
                  {editingAutocompleteKeywords.map((kw, i) => (
                    <span key={i} className={styles.tagChip}>
                      {kw}
                      <button
                        type="button"
                        className={styles.tagChipRemove}
                        onClick={(e) => { e.stopPropagation(); setEditingAutocompleteKeywords((prev) => prev.filter((_, idx) => idx !== i)) }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className={styles.tagInputField}
                    placeholder={editingAutocompleteKeywords.length === 0 ? 'Add keywords...' : ''}
                    value={editKeywordInput}
                    onChange={(e) => setEditKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = editKeywordInput.trim()
                        if (val && !editingAutocompleteKeywords.includes(val)) {
                          setEditingAutocompleteKeywords((prev) => [...prev, val])
                          setEditKeywordInput('')
                        }
                      } else if (e.key === 'Backspace' && !editKeywordInput && editingAutocompleteKeywords.length > 0) {
                        setEditingAutocompleteKeywords((prev) => prev.slice(0, -1))
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.autocompletePopupActions}>
              {editingAutocompleteId !== 'new' ? (
                <button
                  className={styles.sourceDeleteBtn}
                  style={{ width: 'auto', height: 'auto', padding: '6px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 500 }}
                  onClick={() => { setConfirmDeleteAutocomplete(editingAutocompleteId) }}
                >
                  Delete
                </button>
              ) : <span />}
              <div className={styles.autocompletePopupActionsRight}>
                <button className={styles.cancelBtn} onClick={() => { setEditingAutocompleteId(null); setEditingAutocompleteQuestion(''); setEditingAutocompleteKeywords([]); setEditKeywordInput('') }}>Cancel</button>
                <button
                  className={styles.publishBtn}
                  disabled={!editingAutocompleteQuestion.trim()}
                  onClick={editingAutocompleteId === 'new' ? handleAddAutocomplete : handleSaveEditAutocomplete}
                >
                  {editingAutocompleteId === 'new' ? 'Add' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete autocomplete suggestion confirmation */}
      {confirmDeleteAutocomplete && (
        <ConfirmDialog
          title="Delete autocomplete suggestion"
          message="This autocomplete suggestion will be permanently deleted from all roles. This cannot be undone."
          onConfirm={() => handleDeleteAutocomplete(confirmDeleteAutocomplete)}
          onCancel={() => setConfirmDeleteAutocomplete(null)}
        />
      )}

      {/* Add/Edit suggestion popup */}
      {editingSuggestionId && suggestionsAccess === 'edit' && (
        <div className={styles.autocompletePopupOverlay} onClick={() => { setEditingSuggestionId(null); setEditingSuggestionText('') }}>
          <div className={styles.autocompletePopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.autocompletePopupHeader}>
              <span className={styles.autocompletePopupTitle}>{editingSuggestionId === 'new' ? 'New suggestion' : 'Edit suggestion'}</span>
            </div>
            <div className={styles.autocompletePopupBody}>
              <div>
                <input
                  type="text"
                  className={styles.suggestionInput}
                  value={editingSuggestionText}
                  onChange={(e) => setEditingSuggestionText(e.target.value)}
                  placeholder="Suggestion text..."
                  autoFocus
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div className={styles.autocompletePopupActions}>
              {editingSuggestionId !== 'new' ? (
                <button
                  className={styles.sourceDeleteBtn}
                  style={{ width: 'auto', height: 'auto', padding: '6px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 500 }}
                  onClick={() => { setConfirmDeleteSuggestion(editingSuggestionId) }}
                >
                  Delete
                </button>
              ) : <span />}
              <div className={styles.autocompletePopupActionsRight}>
                <button className={styles.cancelBtn} onClick={() => { setEditingSuggestionId(null); setEditingSuggestionText('') }}>Cancel</button>
                <button
                  className={styles.publishBtn}
                  disabled={!editingSuggestionText.trim()}
                  onClick={editingSuggestionId === 'new' ? handleAddSuggestion : handleSaveEditSuggestion}
                >
                  {editingSuggestionId === 'new' ? 'Add' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete suggestion confirmation */}
      {confirmDeleteSuggestion && (
        <ConfirmDialog
          title="Delete suggestion"
          message="This suggestion will be permanently deleted from all roles. This cannot be undone."
          onConfirm={() => handleDeleteSuggestion(confirmDeleteSuggestion)}
          onCancel={() => setConfirmDeleteSuggestion(null)}
        />
      )}

      {/* Edit user role popup */}
      {editingUserId && rolesAccess === 'edit' && (() => {
        const editUser = users.find((u) => u.id === editingUserId)
        if (!editUser) return null
        const isSelf = editUser.id === currentUser?.id
        const currentRole = editUser.user_role ?? 'user'
        const isUpdating = updatingIds.has(editUser.id)
        const picked = selectedRole ?? currentRole
        const roleOptions: { key: string; label: string; description: string; value: 'manager' | 'admin' | null; disabled: boolean }[] = [
          {
            key: 'user',
            label: 'User',
            description: 'Can use the chatbot. No admin access.',
            value: null,
            disabled: isSelf || isUpdating || (isManager && editUser.user_role === 'admin'),
          },
          {
            key: 'manager',
            label: 'Manager',
            description: 'Can manage users, documents, and settings.',
            value: 'manager',
            disabled: isSelf || isUpdating || (isManager && editUser.user_role === 'admin'),
          },
          {
            key: 'admin',
            label: 'Admin',
            description: 'Full access including role management.',
            value: 'admin',
            disabled: isSelf || isUpdating || isManager,
          },
        ]
        const hasChanged = picked !== currentRole
        return (
          <div className={styles.autocompletePopupOverlay} onClick={() => { setEditingUserId(null); setSelectedRole(null) }}>
            <div className={styles.autocompletePopup} onClick={(e) => e.stopPropagation()}>
              <div className={styles.autocompletePopupHeader}>
                <span className={styles.autocompletePopupTitle}>Change role</span>
              </div>
              <div className={styles.autocompletePopupBody}>
                <div className={styles.rolePopupEmail}>{editUser.email}</div>
                <div className={styles.roleCards}>
                  {roleOptions.map((opt) => {
                    const isSelected = picked === opt.key
                    return (
                      <button
                        key={opt.key}
                        className={`${styles.roleCard}${isSelected ? ` ${styles.roleCardActive}` : ''}${opt.disabled ? ` ${styles.roleCardDisabled}` : ''}`}
                        disabled={opt.disabled}
                        onClick={() => setSelectedRole(opt.key)}
                      >
                        <div className={styles.roleCardHeader}>
                          <div className={`${styles.roleCardRadio}${isSelected ? ` ${styles.roleCardRadioActive}` : ''}`}>
                            {isSelected && <div className={styles.roleCardRadioDot} />}
                          </div>
                          <span className={styles.roleCardLabel}>{opt.label}</span>
                        </div>
                        <span className={styles.roleCardDesc}>{opt.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={styles.autocompletePopupActions}>
                <span />
                <div className={styles.autocompletePopupActionsRight}>
                  <button className={styles.cancelBtn} onClick={() => { setEditingUserId(null); setSelectedRole(null) }}>Cancel</button>
                  <button
                    className={styles.publishBtn}
                    disabled={!hasChanged || isUpdating}
                    onClick={async () => {
                      const opt = roleOptions.find((o) => o.key === picked)
                      if (opt) await handleSetRole(editUser.id, opt.value)
                      setEditingUserId(null)
                      setSelectedRole(null)
                    }}
                  >
                    {isUpdating ? 'Saving…' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Unsaved changes warning */}
      {pendingAction && (
        <div className={styles.autocompletePopupOverlay} onClick={() => setPendingAction(null)}>
          <div className={styles.autocompletePopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.autocompletePopupHeader}>
              <span className={styles.autocompletePopupTitle}>Unsaved changes</span>
            </div>
            <div className={styles.autocompletePopupBody}>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                You have unsaved changes. What would you like to do?
              </p>
            </div>
            <div className={styles.autocompletePopupActions}>
              <button className={styles.cancelBtn} style={{ whiteSpace: 'nowrap' }} onClick={() => setPendingAction(null)}>
                Cancel
              </button>
              <div className={styles.autocompletePopupActionsRight}>
                <button
                  className={styles.cancelBtn}
                  style={{ color: '#dc2626', borderColor: '#fecaca', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    const action = pendingAction
                    setPendingAction(null)
                    setLocalPerms(null)
                    action()
                  }}
                >
                  Discard changes
                </button>
                <button
                  className={styles.publishBtn}
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={async () => {
                    const action = pendingAction
                    setPendingAction(null)
                    await handleSaveAllPermissions()
                    action()
                  }}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
