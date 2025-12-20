# API Contracts

**Feature**: 007-flexible-payment-schedule  
**Date**: 2025-11-27

## Not Applicable

This feature does not require API contracts because:

1. **Local-first architecture**: The application uses IndexedDB (via Dexie.js) for data persistence with no backend server
2. **No external APIs**: All data operations are client-side
3. **No network communication**: The app works entirely offline

## Internal Interfaces

For internal TypeScript interfaces and Zod schemas, see:

- `data-model.md` - Entity definitions and validation schemas
- `src/types/index.ts` - Runtime type definitions
- `src/lib/cashflow/validators.ts` - Engine input validation

## Future Considerations

If cloud sync is added in the future, API contracts would be defined for:

- Project CRUD operations
- Payment schedule synchronization
- Conflict resolution for concurrent edits

