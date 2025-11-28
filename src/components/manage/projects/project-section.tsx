import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectList } from './project-list'
import { SingleShotIncomeList } from './single-shot-income-list'
import type { Project, SingleShotIncome } from '@/types'

interface ProjectSectionProps {
  recurringProjects: Project[]
  singleShotIncome: SingleShotIncome[]
  onAddRecurring: () => void
  onAddSingleShot: () => void
  onEditRecurring: (project: Project) => void
  onEditSingleShot: (income: SingleShotIncome) => void
  onDeleteRecurring: (id: string) => void
  onDeleteSingleShot: (id: string) => void
  onToggleRecurringActive: (id: string) => void
}

export function ProjectSection({
  recurringProjects,
  singleShotIncome,
  onAddRecurring,
  onAddSingleShot,
  onEditRecurring,
  onEditSingleShot,
  onDeleteRecurring,
  onDeleteSingleShot,
  onToggleRecurringActive,
}: ProjectSectionProps) {
  return (
    <Tabs defaultValue="recurring" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
        <TabsTrigger value="single_shot">Pontuais</TabsTrigger>
      </TabsList>

      <TabsContent value="recurring">
        <ProjectList
          projects={recurringProjects}
          onAdd={onAddRecurring}
          onEdit={onEditRecurring}
          onDelete={onDeleteRecurring}
          onToggleActive={onToggleRecurringActive}
        />
      </TabsContent>

      <TabsContent value="single_shot">
        <SingleShotIncomeList
          income={singleShotIncome}
          onAdd={onAddSingleShot}
          onEdit={onEditSingleShot}
          onDelete={onDeleteSingleShot}
        />
      </TabsContent>
    </Tabs>
  )
}

