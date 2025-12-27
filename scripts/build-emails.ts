import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import mjml2html from 'mjml'

import { SUPABASE_EMAIL_TEMPLATES } from './emails/supabase-templates'

function assertIncludes(templateId: string, haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`Template ${templateId} is missing required placeholder: ${needle}`)
  }
}

function formatMjmlErrors(errors: unknown): string {
  if (!Array.isArray(errors) || errors.length === 0) {
    return ''
  }

  return errors
    .map((err) => {
      if (typeof err === 'string') return err

      if (err && typeof err === 'object') {
        const maybe = err as Record<string, unknown>
        const message = typeof maybe.message === 'string' ? maybe.message : 'MJML error'
        const formattedMessage =
          typeof maybe.formattedMessage === 'string' ? maybe.formattedMessage : undefined
        return formattedMessage ? `${message}\n${formattedMessage}` : message
      }

      return 'MJML error'
    })
    .join('\n')
}

async function buildSupabaseTemplates(): Promise<void> {
  const repoRoot = process.cwd()

  const failures: Array<{ templateId: string; error: string }> = []

  for (const template of SUPABASE_EMAIL_TEMPLATES) {
    const templateId = `${template.kind}.${template.type}`

    const sourcePath = path.join(repoRoot, template.mjmlPath)
    const outputPath = path.join(repoRoot, template.htmlPath)

    const mjml = await readFile(sourcePath, 'utf8')

    const result = mjml2html(mjml, {
      filePath: path.dirname(sourcePath),
      validationLevel: 'strict',
    })

    const mjmlErrors = formatMjmlErrors(result.errors)
    if (mjmlErrors) {
      failures.push({ templateId, error: mjmlErrors })
      continue
    }

    await mkdir(path.dirname(outputPath), { recursive: true })

    // MJML emits some attributes in HTML-boolean style (e.g. `style` without a value).
    // Some tooling/email clients are stricter, so we normalize the output.
    let html = result.html
    html = html.replaceAll('style width="100%"', 'style="width:100%" width="100%"')

    // Guardrail: ensure core Supabase placeholders are still present after compilation.
    // This prevents broken emails where the user can't click a link / enter a code.
    try {
      if (template.kind === 'auth') {
        if (template.type === 'reauthentication') {
          assertIncludes(templateId, html, '{{ .Token }}')
        } else {
          assertIncludes(templateId, html, '{{ .ConfirmationURL }}')
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      failures.push({ templateId, error: message })
      continue
    }

    await writeFile(outputPath, html, 'utf8')
  }

  if (failures.length > 0) {
    const message = failures
      .map((f) => `\n---\n${f.templateId}\n${f.error}`)
      .join('')

    throw new Error(`MJML compilation failed for ${failures.length} template(s).${message}`)
  }
}

buildSupabaseTemplates().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(message)
  process.exitCode = 1
})


