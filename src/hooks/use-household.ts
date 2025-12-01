import { useState, useEffect, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Profile } from '@/types'

export interface HouseholdInfo {
  id: string
  name: string
}

export interface HouseholdMember extends Profile {
  isCurrentUser: boolean
}

export interface UseHouseholdReturn {
  household: HouseholdInfo | null
  members: HouseholdMember[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch and manage household data.
 * Returns the current user's household and all members.
 */
export function useHousehold(): UseHouseholdReturn {
  const [household, setHousehold] = useState<HouseholdInfo | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
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

    async function fetchHouseholdData() {
      try {
        if (mounted) setError(null)
        const client = getSupabase()
        
        // Fetch household via RLS (returns only user's household)
        const { data: householdData, error: householdError } = await client
          .from('households')
          .select('id, name')
          .single()
        
        if (!mounted) return
        
        if (householdError) {
          // PGRST116 means no rows - user is orphaned
          if (householdError.code === 'PGRST116') {
            setError('Sua conta está desassociada. Entre em contato com o administrador.')
            setHousehold(null)
            setMembers([])
            return
          }
          throw householdError
        }
        
        setHousehold({
          id: householdData.id,
          name: householdData.name,
        })
        
        // Fetch members (RLS filters to same household)
        const { data: membersData, error: membersError } = await client
          .from('profiles')
          .select('id, name, email, household_id')
          .order('name')
        
        if (!mounted) return
        
        if (membersError) throw membersError
        
        // Compare by email since profile.id may not match auth.uid()
        const currentUserEmail = user?.email?.toLowerCase()
        
        setMembers(
          (membersData ?? []).map((m) => ({
            id: m.id as string,
            name: m.name as string,
            householdId: m.household_id as string,
            isCurrentUser: (m.email as string)?.toLowerCase() === currentUserEmail,
          }))
        )
      } catch (err) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Falha ao carregar residência'
        setError(message)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchHouseholdData()
    
    return () => {
      mounted = false
    }
  }, [isAuthenticated, user?.id, retryCount])

  return { household, members, isLoading, error, refetch }
}

