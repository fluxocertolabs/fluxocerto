/**
 * Tour definitions for first-time page visits.
 * 
 * Each tour consists of steps that highlight specific UI elements
 * and provide contextual guidance in pt-BR.
 */

import type { TourKey } from '@/types'

/**
 * A single step in a tour.
 */
export interface TourStep {
  /** CSS selector for the target element */
  target: string
  /** Title of the step (pt-BR) */
  title: string
  /** Description/content of the step (pt-BR) */
  content: string
  /** Position of the tooltip relative to the target */
  placement?: 'top' | 'right' | 'bottom' | 'left'
  /** Whether to allow interaction with the target element */
  allowInteraction?: boolean
}

/**
 * A complete tour definition.
 */
export interface TourDefinition {
  /** Unique tour key */
  key: TourKey
  /** Tour version - increment to re-show to users who completed an older version */
  version: number
  /** Tour title (pt-BR) */
  title: string
  /** Tour steps */
  steps: TourStep[]
}

/**
 * Dashboard tour - introduces the cashflow projection interface.
 */
export const DASHBOARD_TOUR: TourDefinition = {
  key: 'dashboard',
  version: 1,
  title: 'Conheça o Painel',
  steps: [
    {
      target: '[data-tour="projection-selector"]',
      title: 'Período de Projeção',
      content: 'Escolha quantos dias quer visualizar na sua projeção de fluxo de caixa: 30, 60 ou 90 dias.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="cashflow-chart"]',
      title: 'Gráfico de Fluxo de Caixa',
      content: 'Este gráfico mostra sua projeção de saldo ao longo do tempo. As áreas vermelhas indicam quando seu saldo pode ficar negativo.',
      placement: 'top',
    },
    {
      target: '[data-tour="summary-panel"]',
      title: 'Resumo Financeiro',
      content: 'Aqui você vê um resumo das suas receitas, despesas e saldo projetado para o período selecionado.',
      placement: 'top',
    },
    {
      target: '[data-tour="quick-update"]',
      title: 'Atualizar Saldos',
      content: 'Mantenha seus saldos atualizados para ter projeções mais precisas. Recomendamos atualizar semanalmente.',
      placement: 'left',
    },
    {
      target: '[data-tour="save-snapshot"]',
      title: 'Salvar Projeção',
      content: 'Salve uma "foto" da sua projeção atual para comparar com projeções futuras e acompanhar sua evolução.',
      placement: 'left',
    },
  ],
}

/**
 * Manage tour - introduces the data management interface.
 */
export const MANAGE_TOUR: TourDefinition = {
  key: 'manage',
  version: 1,
  title: 'Conheça o Gerenciamento',
  steps: [
    {
      target: '[data-tour="manage-tabs"]',
      title: 'Abas de Gerenciamento',
      content: 'Navegue entre Contas, Receitas, Despesas, Cartões e Grupo para gerenciar seus dados financeiros.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="accounts-tab"]',
      title: 'Contas Bancárias',
      content: 'Adicione suas contas bancárias e mantenha os saldos atualizados para projeções precisas.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="projects-tab"]',
      title: 'Fontes de Renda',
      content: 'Cadastre suas fontes de renda recorrentes (salário, freelance) e pontuais (bônus, vendas).',
      placement: 'bottom',
    },
    {
      target: '[data-tour="expenses-tab"]',
      title: 'Despesas',
      content: 'Registre suas despesas fixas (aluguel, contas) e pontuais (compras, viagens).',
      placement: 'bottom',
    },
    {
      target: '[data-tour="cards-tab"]',
      title: 'Cartões de Crédito',
      content: 'Adicione seus cartões e registre faturas futuras para incluí-las na projeção.',
      placement: 'bottom',
    },
  ],
}

/**
 * History tour - introduces the snapshot history interface.
 */
export const HISTORY_TOUR: TourDefinition = {
  key: 'history',
  version: 1,
  title: 'Conheça o Histórico',
  steps: [
    {
      target: '[data-tour="snapshot-list"]',
      title: 'Suas Projeções Salvas',
      content: 'Aqui você encontra todas as projeções que salvou. Clique em uma para ver os detalhes completos e comparar com a situação atual.',
      placement: 'top',
    },
  ],
}

/**
 * All tour definitions indexed by key.
 */
export const TOURS: Record<TourKey, TourDefinition> = {
  dashboard: DASHBOARD_TOUR,
  manage: MANAGE_TOUR,
  history: HISTORY_TOUR,
}

/**
 * Get tour definition by key.
 */
export function getTourDefinition(key: TourKey): TourDefinition {
  return TOURS[key]
}

/**
 * Get the current version of a tour.
 */
export function getTourVersion(key: TourKey): number {
  return TOURS[key].version
}

/**
 * Check if a tour has been updated since a given version.
 */
export function isTourUpdated(key: TourKey, completedVersion: number): boolean {
  return TOURS[key].version > completedVersion
}

