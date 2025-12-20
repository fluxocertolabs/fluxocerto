# Contracts: Cashflow Dashboard

**Feature**: 004-cashflow-dashboard  
**Date**: 2025-11-26

## Status: Not Applicable

This feature is a **UI-only dashboard** that:
- Reads data from existing local IndexedDB database
- Uses the existing cashflow calculation engine
- Does not expose any external APIs
- Does not communicate with any backend services

Therefore, no API contracts (OpenAPI/GraphQL schemas) are required.

## Internal Interfaces

The feature uses these existing internal interfaces:

### Cashflow Engine (existing)
- Location: `src/lib/cashflow/index.ts`
- Function: `calculateCashflow(input: CashflowEngineInput): CashflowProjection`
- See `src/lib/cashflow/types.ts` for type definitions

### Database (existing)
- Location: `src/db/index.ts`
- Tables: `accounts`, `projects`, `expenses`, `creditCards`
- Access via Dexie.js hooks: `useLiveQuery`

### State Store (existing)
- Location: `src/stores/finance-store.ts`
- Used for data mutations (not used by dashboard - read-only)

## Future Considerations

If this app adds cloud sync or external API integration in the future, contracts would be defined for:
- Sync API endpoints
- Authentication flows
- Data export/import formats

