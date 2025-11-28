import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useCoordinatedLoading } from '@/hooks/use-coordinated-loading'
import { useFinanceStore } from '@/stores/finance-store'
import { AccountList } from '@/components/manage/accounts/account-list'
import { AccountForm } from '@/components/manage/accounts/account-form'
import { ProjectList } from '@/components/manage/projects/project-list'
import { ProjectForm } from '@/components/manage/projects/project-form'
import { ExpenseForm } from '@/components/manage/expenses/expense-form'
import { ExpenseSection } from '@/components/manage/expenses/expense-section'
import { SingleShotExpenseForm } from '@/components/manage/expenses/single-shot-expense-form'
import { CreditCardList } from '@/components/manage/credit-cards/credit-card-list'
import { CreditCardForm } from '@/components/manage/credit-cards/credit-card-form'
import { DeleteConfirmation } from '@/components/manage/shared/delete-confirmation'
import { PageLoadingWrapper, ManageSkeleton } from '@/components/loading'
import { cn } from '@/lib/utils'
import type {
  BankAccount,
  BankAccountInput,
  Project,
  ProjectInput,
  FixedExpense,
  FixedExpenseInput,
  SingleShotExpense,
  CreditCard,
  CreditCardInput,
} from '@/types'

type TabValue = 'accounts' | 'projects' | 'expenses' | 'cards'

type DialogState =
  | { type: 'none' }
  | { type: 'add-account' }
  | { type: 'edit-account'; account: BankAccount }
  | { type: 'add-project' }
  | { type: 'edit-project'; project: Project }
  | { type: 'add-expense' }
  | { type: 'edit-expense'; expense: FixedExpense }
  | { type: 'add-single-shot-expense' }
  | { type: 'edit-single-shot-expense'; expense: SingleShotExpense }
  | { type: 'add-card' }
  | { type: 'edit-card'; card: CreditCard }

type DeleteState =
  | { type: 'none' }
  | { type: 'account'; id: string; name: string }
  | { type: 'project'; id: string; name: string }
  | { type: 'expense'; id: string; name: string }
  | { type: 'single-shot-expense'; id: string; name: string }
  | { type: 'card'; id: string; name: string }

export function ManagePage() {
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const stored = sessionStorage.getItem('manage-active-tab')
    if (stored && ['accounts', 'projects', 'expenses', 'cards'].includes(stored)) {
      return stored as TabValue
    }
    return 'accounts'
  })

  const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' })
  const [deleteState, setDeleteState] = useState<DeleteState>({ type: 'none' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { accounts, projects, fixedExpenses, singleShotExpenses, creditCards, isLoading, error: fetchError, retry } = useFinanceData()
  const store = useFinanceStore()

  // Coordinated loading state for smooth transitions
  const loadingState = useCoordinatedLoading(
    isLoading,
    fetchError,
    retry
  )

  const handleTabChange = (value: string) => {
    const tabValue = value as TabValue
    setActiveTab(tabValue)
    sessionStorage.setItem('manage-active-tab', tabValue)
  }

  const closeDialog = () => {
    setDialogState({ type: 'none' })
    setError(null)
  }
  const closeDeleteDialog = () => {
    setDeleteState({ type: 'none' })
    setError(null)
  }

  // Account handlers
  const handleAddAccount = async (data: BankAccountInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.addAccount(data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to add account:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAccount = async (id: string, data: BankAccountInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.updateAccount(id, data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to update account:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteState.type !== 'account') return
    setIsDeleting(true)
    setError(null)
    try {
      const result = await store.deleteAccount(deleteState.id)
      if (result.success) {
        closeDeleteDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to delete account:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateAccountBalance = async (id: string, balance: number) => {
    const result = await store.updateAccount(id, { balance })
    if (!result.success) {
      console.error('Failed to update account balance:', result.error)
    }
  }

  // Project handlers
  const handleAddProject = async (data: ProjectInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.addProject(data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to add project:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateProject = async (id: string, data: ProjectInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.updateProject(id, data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to update project:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProject = async () => {
    if (deleteState.type !== 'project') return
    setIsDeleting(true)
    setError(null)
    try {
      const result = await store.deleteProject(deleteState.id)
      if (result.success) {
        closeDeleteDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to delete project:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleProjectActive = async (id: string) => {
    const result = await store.toggleProjectActive(id)
    if (!result.success) {
      console.error('Failed to toggle project active:', result.error)
    }
  }

  // Expense handlers
  const handleAddExpense = async (data: FixedExpenseInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.addExpense(data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to add expense:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateExpense = async (id: string, data: FixedExpenseInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.updateExpense(id, data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to update expense:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async () => {
    if (deleteState.type !== 'expense') return
    setIsDeleting(true)
    setError(null)
    try {
      const result = await store.deleteExpense(deleteState.id)
      if (result.success) {
        closeDeleteDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to delete expense:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleExpenseActive = async (id: string) => {
    const result = await store.toggleExpenseActive(id)
    if (!result.success) {
      console.error('Failed to toggle expense active:', result.error)
    }
  }

  // Single-shot expense handlers
  const handleAddSingleShotExpense = async (data: { name: string; amount: number; date: Date }) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.addSingleShotExpense({
        type: 'single_shot',
        ...data,
      })
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to add single-shot expense:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateSingleShotExpense = async (id: string, data: { name: string; amount: number; date: Date }) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.updateSingleShotExpense(id, data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to update single-shot expense:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSingleShotExpense = async () => {
    if (deleteState.type !== 'single-shot-expense') return
    setIsDeleting(true)
    setError(null)
    try {
      const result = await store.deleteSingleShotExpense(deleteState.id)
      if (result.success) {
        closeDeleteDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to delete single-shot expense:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Credit card handlers
  const handleAddCreditCard = async (data: CreditCardInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.addCreditCard(data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to add credit card:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCreditCard = async (id: string, data: CreditCardInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await store.updateCreditCard(id, data)
      if (result.success) {
        closeDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to update credit card:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCreditCard = async () => {
    if (deleteState.type !== 'card') return
    setIsDeleting(true)
    setError(null)
    try {
      const result = await store.deleteCreditCard(deleteState.id)
      if (result.success) {
        closeDeleteDialog()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado')
      console.error('Failed to delete credit card:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateCreditCardBalance = async (id: string, balance: number) => {
    const result = await store.updateCreditCard(id, { statementBalance: balance })
    if (!result.success) {
      console.error('Failed to update credit card balance:', result.error)
    }
  }

  // Delete confirmation handler
  const handleDeleteConfirm = async () => {
    switch (deleteState.type) {
      case 'account':
        return handleDeleteAccount()
      case 'project':
        return handleDeleteProject()
      case 'expense':
        return handleDeleteExpense()
      case 'single-shot-expense':
        return handleDeleteSingleShotExpense()
      case 'card':
        return handleDeleteCreditCard()
    }
  }

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className={cn('container mx-auto p-4 md:p-6 max-w-4xl')}>
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Gerenciar Dados Financeiros
      </h1>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <PageLoadingWrapper
        loadingState={loadingState}
        skeleton={<ManageSkeleton />}
      >
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="grid w-full sm:w-auto grid-cols-4">
              <TabsTrigger value="accounts">Contas</TabsTrigger>
              <TabsTrigger value="projects">Projetos</TabsTrigger>
              <TabsTrigger value="expenses">Despesas</TabsTrigger>
              <TabsTrigger value="cards">Cartões</TabsTrigger>
            </TabsList>

            {activeTab === 'accounts' && (
              <Button onClick={() => setDialogState({ type: 'add-account' })}>
                Adicionar Conta
              </Button>
            )}
            {activeTab === 'projects' && (
              <Button onClick={() => setDialogState({ type: 'add-project' })}>
                Adicionar Projeto
              </Button>
            )}
            {/* Expenses add button removed - handled inside ExpenseSection tabs */}
            {activeTab === 'cards' && (
              <Button onClick={() => setDialogState({ type: 'add-card' })}>
                Adicionar Cartão de Crédito
              </Button>
            )}
          </div>

          <TabsContent value="accounts">
            <AccountList
              accounts={accounts}
              onAdd={() => setDialogState({ type: 'add-account' })}
              onEdit={(account) => setDialogState({ type: 'edit-account', account })}
              onDelete={(id) => {
                const account = accounts.find((a) => a.id === id)
                if (account) {
                  setDeleteState({ type: 'account', id, name: account.name })
                }
              }}
              onUpdateBalance={handleUpdateAccountBalance}
            />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectList
              projects={projects}
              onAdd={() => setDialogState({ type: 'add-project' })}
              onEdit={(project) => setDialogState({ type: 'edit-project', project })}
              onDelete={(id) => {
                const project = projects.find((p) => p.id === id)
                if (project) {
                  setDeleteState({ type: 'project', id, name: project.name })
                }
              }}
              onToggleActive={handleToggleProjectActive}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseSection
              fixedExpenses={fixedExpenses}
              singleShotExpenses={singleShotExpenses}
              onAddFixed={() => setDialogState({ type: 'add-expense' })}
              onAddSingleShot={() => setDialogState({ type: 'add-single-shot-expense' })}
              onEditFixed={(expense) => setDialogState({ type: 'edit-expense', expense })}
              onEditSingleShot={(expense) => setDialogState({ type: 'edit-single-shot-expense', expense })}
              onDeleteFixed={(id) => {
                const expense = fixedExpenses.find((e) => e.id === id)
                if (expense) {
                  setDeleteState({ type: 'expense', id, name: expense.name })
                }
              }}
              onDeleteSingleShot={(id) => {
                const expense = singleShotExpenses.find((e) => e.id === id)
                if (expense) {
                  setDeleteState({ type: 'single-shot-expense', id, name: expense.name })
                }
              }}
              onToggleFixedActive={handleToggleExpenseActive}
            />
          </TabsContent>

          <TabsContent value="cards">
            <CreditCardList
              creditCards={creditCards}
              onAdd={() => setDialogState({ type: 'add-card' })}
              onEdit={(card) => setDialogState({ type: 'edit-card', card })}
              onDelete={(id) => {
                const card = creditCards.find((c) => c.id === id)
                if (card) {
                  setDeleteState({ type: 'card', id, name: card.name })
                }
              }}
              onUpdateBalance={handleUpdateCreditCardBalance}
            />
          </TabsContent>
        </Tabs>
      </PageLoadingWrapper>

      {/* Account Dialog */}
      <Dialog
        open={dialogState.type === 'add-account' || dialogState.type === 'edit-account'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'edit-account' ? 'Editar Conta' : 'Adicionar Conta'}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            account={dialogState.type === 'edit-account' ? dialogState.account : undefined}
            onSubmit={async (data) => {
              if (dialogState.type === 'edit-account') {
                await handleUpdateAccount(dialogState.account.id, data)
              } else {
                await handleAddAccount(data)
              }
            }}
            onCancel={closeDialog}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog
        open={dialogState.type === 'add-project' || dialogState.type === 'edit-project'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'edit-project' ? 'Editar Projeto' : 'Adicionar Projeto'}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={dialogState.type === 'edit-project' ? dialogState.project : undefined}
            onSubmit={async (data) => {
              if (dialogState.type === 'edit-project') {
                await handleUpdateProject(dialogState.project.id, data)
              } else {
                await handleAddProject(data)
              }
            }}
            onCancel={closeDialog}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog
        open={dialogState.type === 'add-expense' || dialogState.type === 'edit-expense'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'edit-expense' ? 'Editar Despesa' : 'Adicionar Despesa'}
            </DialogTitle>
          </DialogHeader>
          <ExpenseForm
            expense={dialogState.type === 'edit-expense' ? dialogState.expense : undefined}
            onSubmit={async (data) => {
              if (dialogState.type === 'edit-expense') {
                await handleUpdateExpense(dialogState.expense.id, data)
              } else {
                await handleAddExpense(data)
              }
            }}
            onCancel={closeDialog}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Single-Shot Expense Dialog */}
      <Dialog
        open={dialogState.type === 'add-single-shot-expense' || dialogState.type === 'edit-single-shot-expense'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'edit-single-shot-expense' ? 'Editar Despesa Pontual' : 'Adicionar Despesa Pontual'}
            </DialogTitle>
          </DialogHeader>
          <SingleShotExpenseForm
            expense={dialogState.type === 'edit-single-shot-expense' ? dialogState.expense : undefined}
            onSubmit={async (data) => {
              if (dialogState.type === 'edit-single-shot-expense') {
                await handleUpdateSingleShotExpense(dialogState.expense.id, data)
              } else {
                await handleAddSingleShotExpense(data)
              }
            }}
            onCancel={closeDialog}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Credit Card Dialog */}
      <Dialog
        open={dialogState.type === 'add-card' || dialogState.type === 'edit-card'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'edit-card' ? 'Editar Cartão de Crédito' : 'Adicionar Cartão de Crédito'}
            </DialogTitle>
          </DialogHeader>
          <CreditCardForm
            card={dialogState.type === 'edit-card' ? dialogState.card : undefined}
            onSubmit={async (data) => {
              if (dialogState.type === 'edit-card') {
                await handleUpdateCreditCard(dialogState.card.id, data)
              } else {
                await handleAddCreditCard(data)
              }
            }}
            onCancel={closeDialog}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmation
        open={deleteState.type !== 'none'}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        entityName={deleteState.type !== 'none' ? deleteState.name : ''}
        entityType={
          deleteState.type === 'account'
            ? 'Conta'
            : deleteState.type === 'project'
              ? 'Projeto'
              : deleteState.type === 'expense'
                ? 'Despesa Fixa'
                : deleteState.type === 'single-shot-expense'
                  ? 'Despesa Pontual'
                  : deleteState.type === 'card'
                    ? 'Cartão de Crédito'
                    : ''
        }
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  )
}
