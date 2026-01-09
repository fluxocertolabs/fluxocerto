import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExpenseList } from './expense-list'
import { SingleShotExpenseList } from './single-shot-expense-list'
import type { FixedExpense, SingleShotExpense } from '@/types'

interface ExpenseSectionProps {
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  onAddFixed: () => void
  onAddSingleShot: () => void
  onEditFixed: (expense: FixedExpense) => void
  onEditSingleShot: (expense: SingleShotExpense) => void
  onDeleteFixed: (id: string) => void
  onDeleteSingleShot: (id: string) => void
  onToggleFixedActive: (id: string) => void
  /** Optional callback to open the onboarding wizard */
  onStartSetup?: () => void
}

export function ExpenseSection({
  fixedExpenses,
  singleShotExpenses,
  onAddFixed,
  onAddSingleShot,
  onEditFixed,
  onEditSingleShot,
  onDeleteFixed,
  onDeleteSingleShot,
  onToggleFixedActive,
  onStartSetup,
}: ExpenseSectionProps) {
  return (
    <Tabs defaultValue="fixed" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="fixed">Fixas</TabsTrigger>
        <TabsTrigger value="single_shot">Pontuais</TabsTrigger>
      </TabsList>

      <TabsContent value="fixed">
        <ExpenseList
          expenses={fixedExpenses}
          onAdd={onAddFixed}
          onEdit={onEditFixed}
          onDelete={onDeleteFixed}
          onToggleActive={onToggleFixedActive}
          onStartSetup={onStartSetup}
        />
      </TabsContent>

      <TabsContent value="single_shot">
        <SingleShotExpenseList
          expenses={singleShotExpenses}
          onAdd={onAddSingleShot}
          onEdit={onEditSingleShot}
          onDelete={onDeleteSingleShot}
        />
      </TabsContent>
    </Tabs>
  )
}

