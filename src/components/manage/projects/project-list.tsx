import type { Project } from '@/types'
import { Button } from '@/components/ui/button'
import { EntityEmptyState } from '@/components/manage/shared/entity-empty-state'
import { ProjectListItem } from './project-list-item'

interface ProjectListProps {
  projects: Project[]
  onAdd: () => void
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
}

export function ProjectList({
  projects,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}: ProjectListProps) {
  if (projects.length === 0) {
    return <EntityEmptyState entityType="project" onAdd={onAdd} />
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {projects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            onEdit={() => onEdit(project)}
            onDelete={() => onDelete(project.id)}
            onToggleActive={() => onToggleActive(project.id)}
          />
        ))}
      </div>
      <Button onClick={onAdd} variant="outline" className="w-full">
        Adicionar Receita Recorrente
      </Button>
    </div>
  )
}
