import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function readProjectFile(...segments: string[]) {
  const filePath = path.join(process.cwd(), ...segments)
  return fs.readFileSync(filePath, 'utf8')
}

describe('guardrails: no localhost ingest debug calls committed', () => {
  it('does not include hardcoded localhost ingest endpoints or agent log regions', () => {
    const files = [
      readProjectFile('src', 'lib', 'supabase.ts'),
      readProjectFile('src', 'stores', 'notifications-store.ts'),
    ]

    for (const content of files) {
      expect(content).not.toContain('localhost:7245/ingest')
      // Flag the exact debug marker we used for the localhost ingest instrumentation.
      // (Avoid matching other unrelated regions that might exist in the future.)
      expect(content).not.toMatch(/#region\s+agent\s+log[\s\S]*?#endregion/)
    }
  })
})

