/**
 * Schema version utilities for projection snapshots.
 * Re-exports the current schema version and provides compatibility helpers.
 */

export { CURRENT_SCHEMA_VERSION } from '@/types/snapshot'

/**
 * Check if a schema version is compatible with the current version.
 * For now, all versions up to and including current are compatible.
 */
export function isSchemaVersionCompatible(version: number): boolean {
  return version >= 1 && version <= 1 // CURRENT_SCHEMA_VERSION
}

