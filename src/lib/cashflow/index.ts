/**
 * Cashflow Calculation Engine
 *
 * Pure TypeScript module that projects daily cashflow balances over a configurable period.
 * Calculates two parallel scenarios (optimistic and pessimistic) based on income certainty levels.
 */

export { calculateCashflow } from './calculate'

export {
  calculateEstimatedTodayBalance,
  rebaseProjectionFromEstimatedToday,
} from './estimate-today'

export type { BalanceUpdateBase, EstimatedTodayBalance } from './estimate-today'

