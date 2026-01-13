import { useState, useEffect, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured, ensureCurrentUserGroup } from '@/lib/supabase'
import { subscribeToGroupDataInvalidation } from '@/lib/group-data-events'
import { useAuth } from '@/hooks/use-auth'
import type { Profile } from '@/types'

export interface GroupInfo {
  id: string
  name: string
}

export interface GroupMember extends Profile {
  isCurrentUser: boolean
}

export interface UseGroupReturn {
  group: GroupInfo | null
  members: GroupMember[]
  isLoading: boolean
  error: string | null
  /** Whether the error is recoverable via retry */
  isRecoverable: boolean
  /** Retry fetching group data (includes self-heal attempt) */
  retry: () => void
  /** Explicitly trigger provisioning recovery */
  recoverProvisioning: () => Promise<boolean>
}

/**
 * Hook to fetch and manage group data.
 * Returns the current user's group and all members.
 * 
 * Includes self-heal logic: if the group query returns "no rows" (PGRST116),
 * automatically attempts to provision the user via ensure_current_user_group RPC.
 */
export function useGroup(): UseGroupReturn {
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRecoverable, setIsRecoverable] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  const { isAuthenticated, user } = useAuth()
  
  const retry = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

  const recoverProvisioning = useCallback(async (): Promise<boolean> => {
    const result = await ensureCurrentUserGroup()
    if (result.success) {
      // Trigger a refetch after successful provisioning
      retry()
      return true
    }
    return false
  }, [retry])

  useEffect(() => {
    if (!isSupabaseConfigured() || !isAuthenticated) {
      setIsLoading(false)
      return
    }

    let mounted = true

    async function fetchGroupData() {
      try {
        if (mounted) {
          setError(null)
          setIsRecoverable(false)
        }
        const client = getSupabase()
        
        // Fetch group via RLS (returns only user's group)
        const { data: groupData, error: groupError } = await client
          .from('groups')
          .select('id, name')
          .single()
        
        if (!mounted) return
        
        if (groupError) {
          // PGRST116 means no rows - user might be orphaned
          if (groupError.code === 'PGRST116') {
            // Attempt self-heal via provisioning RPC
            const provisionResult = await ensureCurrentUserGroup()
            
            if (!mounted) return
            
            if (provisionResult.success) {
              // Retry fetching group after successful provisioning
              const { data: retryGroupData, error: retryGroupError } = await client
                .from('groups')
                .select('id, name')
                .single()
              
              if (!mounted) return
              
              if (retryGroupError) {
                setError('Sua conta está desassociada. Use "Tentar novamente" ou entre em contato com o suporte.')
                setIsRecoverable(true)
                setGroup(null)
                setMembers([])
                return
              }
              
              // Self-heal succeeded
              setGroup({
                id: retryGroupData.id,
                name: retryGroupData.name,
              })
            } else {
              // Provisioning failed - show recoverable error
              setError('Sua conta está desassociada. Use "Tentar novamente" ou entre em contato com o suporte.')
              setIsRecoverable(true)
              setGroup(null)
              setMembers([])
              return
            }
          } else {
            throw groupError
          }
        } else {
          setGroup({
            id: groupData.id,
            name: groupData.name,
          })
        }
        
        // Fetch members (RLS filters to same group)
        const { data: membersData, error: membersError } = await client
          .from('profiles')
          .select('id, name, email, group_id')
          .order('name')
        
        if (!mounted) return
        
        if (membersError) throw membersError
        
        // Compare by email since profile.id may not match auth.uid()
        const currentUserEmail = user?.email?.toLowerCase()
        
        setMembers(
          (membersData ?? []).map((m) => ({
            id: m.id as string,
            name: m.name as string,
            groupId: m.group_id as string,
            isCurrentUser: (m.email as string)?.toLowerCase() === currentUserEmail,
          }))
        )
      } catch (err) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Falha ao carregar grupo'
        setError(message)
        setIsRecoverable(false)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchGroupData()
    
    return () => {
      mounted = false
    }
  }, [isAuthenticated, user?.id, user?.email, retryCount])

  // Subscribe to group data invalidation events (e.g., profile name updates)
  useEffect(() => {
    const unsubscribe = subscribeToGroupDataInvalidation(() => {
      retry()
    })
    return unsubscribe
  }, [retry])

  return { group, members, isLoading, error, isRecoverable, retry, recoverProvisioning }
}
