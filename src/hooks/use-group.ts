import { useState, useEffect, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
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
  refetch: () => void
}

/**
 * Hook to fetch and manage group data.
 * Returns the current user's group and all members.
 */
export function useGroup(): UseGroupReturn {
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const { isAuthenticated, user } = useAuth()
  
  const refetch = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured() || !isAuthenticated) {
      setIsLoading(false)
      return
    }

    let mounted = true

    async function fetchGroupData() {
      try {
        if (mounted) setError(null)
        const client = getSupabase()
        
        // Fetch group via RLS (returns only user's group)
        const { data: groupData, error: groupError } = await client
          .from('groups')
          .select('id, name')
          .single()
        
        if (!mounted) return
        
        if (groupError) {
          // PGRST116 means no rows - user is orphaned
          if (groupError.code === 'PGRST116') {
            setError('Sua conta está desassociada. Entre em contato com o administrador.')
            setGroup(null)
            setMembers([])
            return
          }
          throw groupError
        }
        
        setGroup({
          id: groupData.id,
          name: groupData.name,
        })
        
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
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchGroupData()
    
    return () => {
      mounted = false
    }
  }, [isAuthenticated, user?.id, user?.email, retryCount])

  return { group, members, isLoading, error, refetch }
}


