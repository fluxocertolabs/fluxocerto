import { User } from 'lucide-react'
import type { HouseholdMember } from '@/hooks/use-household'

interface MembersListProps {
  members: HouseholdMember[]
}

/**
 * List component displaying all household members.
 * Shows "(Você)" indicator next to the current user.
 */
export function MembersList({ members }: MembersListProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum membro encontrado.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {members.map(member => (
        <li 
          key={member.id} 
          className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted/50 transition-colors"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{member.name}</span>
          {member.isCurrentUser && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              (Você)
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

