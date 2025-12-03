/**
 * Unit tests for schema version utilities.
 */

import { describe, it, expect } from 'vitest'
import { CURRENT_SCHEMA_VERSION, isSchemaVersionCompatible } from './schema-version'

describe('schema-version', () => {
  describe('CURRENT_SCHEMA_VERSION', () => {
    it('should export CURRENT_SCHEMA_VERSION as 1', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(1)
    })

    it('should be a number', () => {
      expect(typeof CURRENT_SCHEMA_VERSION).toBe('number')
    })
  })

  describe('isSchemaVersionCompatible', () => {
    it('should return true for current schema version', () => {
      expect(isSchemaVersionCompatible(CURRENT_SCHEMA_VERSION)).toBe(true)
    })

    it('should return true for version 1', () => {
      expect(isSchemaVersionCompatible(1)).toBe(true)
    })

    it('should return false for version 0', () => {
      expect(isSchemaVersionCompatible(0)).toBe(false)
    })

    it('should return false for negative versions', () => {
      expect(isSchemaVersionCompatible(-1)).toBe(false)
      expect(isSchemaVersionCompatible(-100)).toBe(false)
    })

    it('should return false for versions greater than current', () => {
      expect(isSchemaVersionCompatible(2)).toBe(false)
      expect(isSchemaVersionCompatible(100)).toBe(false)
    })

    it('should return false for non-integer versions', () => {
      expect(isSchemaVersionCompatible(1.5)).toBe(false)
      expect(isSchemaVersionCompatible(0.9)).toBe(false)
    })
  })
})

