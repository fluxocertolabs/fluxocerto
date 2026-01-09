/**
 * Tests for tour definitions and helper functions.
 * Tests all pure functions with comprehensive corner cases.
 */

import { describe, it, expect } from 'vitest'
import {
  DASHBOARD_TOUR,
  MANAGE_TOUR,
  HISTORY_TOUR,
  TOURS,
  getTourDefinition,
  getTourVersion,
  isTourUpdated,
  type TourStep,
} from './definitions'
import type { TourKey } from '@/types'

// =============================================================================
// TOUR DEFINITION CONSTANTS TESTS
// =============================================================================

describe('DASHBOARD_TOUR constant', () => {
  it('has correct key', () => {
    expect(DASHBOARD_TOUR.key).toBe('dashboard')
  })

  it('has version >= 1', () => {
    expect(DASHBOARD_TOUR.version).toBeGreaterThanOrEqual(1)
  })

  it('has non-empty title', () => {
    expect(DASHBOARD_TOUR.title.length).toBeGreaterThan(0)
  })

  it('has at least one step', () => {
    expect(DASHBOARD_TOUR.steps.length).toBeGreaterThan(0)
  })

  it('has 5 steps for dashboard tour', () => {
    expect(DASHBOARD_TOUR.steps.length).toBe(5)
  })

  describe('step validation', () => {
    DASHBOARD_TOUR.steps.forEach((step, index) => {
      describe(`step ${index + 1}: "${step.title}"`, () => {
        it('has non-empty target selector', () => {
          expect(step.target.length).toBeGreaterThan(0)
        })

        it('has target starting with [data-tour=', () => {
          expect(step.target).toMatch(/^\[data-tour=/)
        })

        it('has non-empty title', () => {
          expect(step.title.length).toBeGreaterThan(0)
        })

        it('has non-empty content', () => {
          expect(step.content.length).toBeGreaterThan(0)
        })

        it('has valid placement if defined', () => {
          if (step.placement) {
            expect(['top', 'right', 'bottom', 'left']).toContain(step.placement)
          }
        })
      })
    })
  })

  it('covers expected dashboard elements', () => {
    const targets = DASHBOARD_TOUR.steps.map(s => s.target)
    expect(targets).toContain('[data-tour="projection-selector"]')
    expect(targets).toContain('[data-tour="cashflow-chart"]')
    expect(targets).toContain('[data-tour="summary-panel"]')
    expect(targets).toContain('[data-tour="quick-update"]')
    expect(targets).toContain('[data-tour="save-snapshot"]')
  })
})

describe('MANAGE_TOUR constant', () => {
  it('has correct key', () => {
    expect(MANAGE_TOUR.key).toBe('manage')
  })

  it('has version >= 1', () => {
    expect(MANAGE_TOUR.version).toBeGreaterThanOrEqual(1)
  })

  it('has non-empty title', () => {
    expect(MANAGE_TOUR.title.length).toBeGreaterThan(0)
  })

  it('has at least one step', () => {
    expect(MANAGE_TOUR.steps.length).toBeGreaterThan(0)
  })

  it('has 5 steps for manage tour', () => {
    expect(MANAGE_TOUR.steps.length).toBe(5)
  })

  describe('step validation', () => {
    MANAGE_TOUR.steps.forEach((step, index) => {
      describe(`step ${index + 1}: "${step.title}"`, () => {
        it('has non-empty target selector', () => {
          expect(step.target.length).toBeGreaterThan(0)
        })

        it('has target starting with [data-tour=', () => {
          expect(step.target).toMatch(/^\[data-tour=/)
        })

        it('has non-empty title', () => {
          expect(step.title.length).toBeGreaterThan(0)
        })

        it('has non-empty content', () => {
          expect(step.content.length).toBeGreaterThan(0)
        })

        it('has valid placement if defined', () => {
          if (step.placement) {
            expect(['top', 'right', 'bottom', 'left']).toContain(step.placement)
          }
        })
      })
    })
  })

  it('covers expected manage elements', () => {
    const targets = MANAGE_TOUR.steps.map(s => s.target)
    expect(targets).toContain('[data-tour="manage-tabs"]')
    expect(targets).toContain('[data-tour="accounts-tab"]')
    expect(targets).toContain('[data-tour="projects-tab"]')
    expect(targets).toContain('[data-tour="expenses-tab"]')
    expect(targets).toContain('[data-tour="cards-tab"]')
  })
})

describe('HISTORY_TOUR constant', () => {
  it('has correct key', () => {
    expect(HISTORY_TOUR.key).toBe('history')
  })

  it('has version >= 1', () => {
    expect(HISTORY_TOUR.version).toBeGreaterThanOrEqual(1)
  })

  it('has non-empty title', () => {
    expect(HISTORY_TOUR.title.length).toBeGreaterThan(0)
  })

  it('has at least one step', () => {
    expect(HISTORY_TOUR.steps.length).toBeGreaterThan(0)
  })

  it('has 1 step for history tour', () => {
    expect(HISTORY_TOUR.steps.length).toBe(1)
  })

  describe('step validation', () => {
    HISTORY_TOUR.steps.forEach((step, index) => {
      describe(`step ${index + 1}: "${step.title}"`, () => {
        it('has non-empty target selector', () => {
          expect(step.target.length).toBeGreaterThan(0)
        })

        it('has target starting with [data-tour=', () => {
          expect(step.target).toMatch(/^\[data-tour=/)
        })

        it('has non-empty title', () => {
          expect(step.title.length).toBeGreaterThan(0)
        })

        it('has non-empty content', () => {
          expect(step.content.length).toBeGreaterThan(0)
        })

        it('has valid placement if defined', () => {
          if (step.placement) {
            expect(['top', 'right', 'bottom', 'left']).toContain(step.placement)
          }
        })
      })
    })
  })

  it('covers expected history elements', () => {
    const targets = HISTORY_TOUR.steps.map(s => s.target)
    expect(targets).toContain('[data-tour="snapshot-list"]')
  })
})

// =============================================================================
// TOURS RECORD TESTS
// =============================================================================

describe('TOURS record', () => {
  it('contains all expected tour keys', () => {
    const keys = Object.keys(TOURS)
    expect(keys).toContain('dashboard')
    expect(keys).toContain('manage')
    expect(keys).toContain('history')
  })

  it('has exactly 3 tours', () => {
    expect(Object.keys(TOURS).length).toBe(3)
  })

  it('maps to correct tour definitions', () => {
    expect(TOURS.dashboard).toBe(DASHBOARD_TOUR)
    expect(TOURS.manage).toBe(MANAGE_TOUR)
    expect(TOURS.history).toBe(HISTORY_TOUR)
  })

  it('all tours have unique keys matching their record key', () => {
    Object.entries(TOURS).forEach(([key, tour]) => {
      expect(tour.key).toBe(key)
    })
  })

  it('all tours have positive integer versions', () => {
    Object.values(TOURS).forEach(tour => {
      expect(Number.isInteger(tour.version)).toBe(true)
      expect(tour.version).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// getTourDefinition TESTS
// =============================================================================

describe('getTourDefinition', () => {
  describe('valid tour keys', () => {
    const validKeys: TourKey[] = ['dashboard', 'manage', 'history']

    validKeys.forEach(key => {
      it(`returns correct definition for "${key}"`, () => {
        const definition = getTourDefinition(key)
        expect(definition).toBeDefined()
        expect(definition.key).toBe(key)
        expect(definition).toBe(TOURS[key])
      })
    })
  })

  it('returns definition with all required properties', () => {
    const definition = getTourDefinition('dashboard')
    expect(definition).toHaveProperty('key')
    expect(definition).toHaveProperty('version')
    expect(definition).toHaveProperty('title')
    expect(definition).toHaveProperty('steps')
  })

  it('returns definition with steps array', () => {
    const definition = getTourDefinition('dashboard')
    expect(Array.isArray(definition.steps)).toBe(true)
    expect(definition.steps.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// getTourVersion TESTS
// =============================================================================

describe('getTourVersion', () => {
  describe('valid tour keys', () => {
    const validKeys: TourKey[] = ['dashboard', 'manage', 'history']

    validKeys.forEach(key => {
      it(`returns version for "${key}"`, () => {
        const version = getTourVersion(key)
        expect(typeof version).toBe('number')
        expect(version).toBeGreaterThan(0)
        expect(Number.isInteger(version)).toBe(true)
      })
    })
  })

  it('returns same version as tour definition', () => {
    expect(getTourVersion('dashboard')).toBe(DASHBOARD_TOUR.version)
    expect(getTourVersion('manage')).toBe(MANAGE_TOUR.version)
    expect(getTourVersion('history')).toBe(HISTORY_TOUR.version)
  })

  it('returns consistent values on multiple calls', () => {
    const version1 = getTourVersion('dashboard')
    const version2 = getTourVersion('dashboard')
    expect(version1).toBe(version2)
  })
})

// =============================================================================
// isTourUpdated TESTS
// =============================================================================

describe('isTourUpdated', () => {
  describe('version comparison logic', () => {
    it('returns true when current version > completed version', () => {
      // Assuming current version is 1, completed version 0 should return true
      expect(isTourUpdated('dashboard', 0)).toBe(true)
    })

    it('returns false when current version = completed version', () => {
      const currentVersion = getTourVersion('dashboard')
      expect(isTourUpdated('dashboard', currentVersion)).toBe(false)
    })

    it('returns false when current version < completed version', () => {
      const currentVersion = getTourVersion('dashboard')
      expect(isTourUpdated('dashboard', currentVersion + 1)).toBe(false)
    })
  })

  describe('all tour keys', () => {
    const tourKeys: TourKey[] = ['dashboard', 'manage', 'history']

    tourKeys.forEach(key => {
      describe(`tour "${key}"`, () => {
        it('returns true for version 0 (never completed)', () => {
          expect(isTourUpdated(key, 0)).toBe(true)
        })

        it('returns false for current version', () => {
          const currentVersion = getTourVersion(key)
          expect(isTourUpdated(key, currentVersion)).toBe(false)
        })

        it('returns false for future version', () => {
          const currentVersion = getTourVersion(key)
          expect(isTourUpdated(key, currentVersion + 100)).toBe(false)
        })
      })
    })
  })

  describe('edge cases', () => {
    it('handles negative completed version', () => {
      // Negative versions shouldn't happen in practice, but test the behavior
      expect(isTourUpdated('dashboard', -1)).toBe(true)
      expect(isTourUpdated('dashboard', -100)).toBe(true)
    })

    it('handles very large completed version', () => {
      expect(isTourUpdated('dashboard', Number.MAX_SAFE_INTEGER)).toBe(false)
    })

    it('handles decimal completed version (coerced to comparison)', () => {
      // 0.5 < 1, so should return true
      expect(isTourUpdated('dashboard', 0.5)).toBe(true)
      // 1.5 > 1, so should return false (assuming version is 1)
      const currentVersion = getTourVersion('dashboard')
      expect(isTourUpdated('dashboard', currentVersion + 0.5)).toBe(false)
    })
  })
})

// =============================================================================
// TOUR STEP STRUCTURE TESTS
// =============================================================================

describe('TourStep structure validation', () => {
  const allSteps: TourStep[] = [
    ...DASHBOARD_TOUR.steps,
    ...MANAGE_TOUR.steps,
    ...HISTORY_TOUR.steps,
  ]

  it('all steps have valid target selectors', () => {
    allSteps.forEach(step => {
      // Target should be a valid CSS selector format
      expect(step.target).toMatch(/^\[data-tour="[a-z-]+"\]$/)
    })
  })

  it('all steps have pt-BR content (no English)', () => {
    // Simple heuristic: check for common Portuguese words or absence of common English words
    const englishWords = ['the', 'and', 'your', 'click', 'here', 'this']
    
    allSteps.forEach(step => {
      const contentLower = step.content.toLowerCase()
      const titleLower = step.title.toLowerCase()
      
      // Should not contain common English words (using word boundaries for accurate detection)
      englishWords.forEach(word => {
        const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, 'i')
        expect(contentLower).not.toMatch(wordBoundaryRegex)
        expect(titleLower).not.toMatch(wordBoundaryRegex)
      })
    })
  })

  it('all steps have reasonable content length', () => {
    const MAX_TITLE_LENGTH = 50 // Keep titles concise
    const MAX_CONTENT_LENGTH = 300 // Descriptive but not overwhelming
    const MIN_CONTENT_LENGTH = 20 // Ensure meaningful content

    allSteps.forEach(step => {
      expect(step.title.length).toBeLessThan(MAX_TITLE_LENGTH)
      expect(step.content.length).toBeLessThan(MAX_CONTENT_LENGTH)
      expect(step.content.length).toBeGreaterThan(MIN_CONTENT_LENGTH)
    })
  })

  it('no duplicate targets within the same tour', () => {
    [DASHBOARD_TOUR, MANAGE_TOUR, HISTORY_TOUR].forEach(tour => {
      const targets = tour.steps.map(s => s.target)
      const uniqueTargets = new Set(targets)
      expect(uniqueTargets.size).toBe(targets.length)
    })
  })

  it('all placements are valid when defined', () => {
    const validPlacements = ['top', 'right', 'bottom', 'left']
    allSteps.forEach(step => {
      if (step.placement !== undefined) {
        expect(validPlacements).toContain(step.placement)
      }
    })
  })

  it('allowInteraction is boolean when defined', () => {
    allSteps.forEach(step => {
      if (step.allowInteraction !== undefined) {
        expect(typeof step.allowInteraction).toBe('boolean')
      }
    })
  })
})

// =============================================================================
// TOUR DEFINITION CONSISTENCY TESTS
// =============================================================================

describe('Tour definition consistency', () => {
  it('all tours have version 1 (initial release)', () => {
    // This test documents the current state - update when versions change
    expect(DASHBOARD_TOUR.version).toBe(1)
    expect(MANAGE_TOUR.version).toBe(1)
    expect(HISTORY_TOUR.version).toBe(1)
  })

  it('all tours have pt-BR titles', () => {
    // Check for common Portuguese patterns
    expect(DASHBOARD_TOUR.title).toMatch(/Conheça/)
    expect(MANAGE_TOUR.title).toMatch(/Conheça/)
    expect(HISTORY_TOUR.title).toMatch(/Conheça/)
  })

  it('total steps across all tours', () => {
    const totalSteps = DASHBOARD_TOUR.steps.length + 
                       MANAGE_TOUR.steps.length + 
                       HISTORY_TOUR.steps.length
    expect(totalSteps).toBe(11) // 5 + 5 + 1
  })
})
