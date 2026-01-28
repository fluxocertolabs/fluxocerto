import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import mjml2html from 'mjml'

import { SUPABASE_EMAIL_TEMPLATES } from './emails/supabase-templates'

type CustomEmailTemplate = {
  id: string
  mjmlPath: string
  htmlPath: string
}

const CUSTOM_EMAIL_TEMPLATES: CustomEmailTemplate[] = [
  {
    id: 'custom.welcome',
    mjmlPath: 'emails/mjml/custom/welcome.mjml',
    htmlPath: 'supabase/functions/send-welcome-email/welcome.html',
  },
]

/**
 * Asserts that the compiled template includes a required Supabase GoTemplate placeholder.
 */
function assertIncludes(templateId: string, haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`Template ${templateId} is missing required placeholder: ${needle}`)
  }
}

/**
 * Some Supabase auth templates can be implemented either using the default
 * `{{ .ConfirmationURL }}` (which points to `*.supabase.co/auth/v1/verify`)
 * OR using a first-party link that includes `token_hash` + `type`, where the app
 * calls `supabase.auth.verifyOtp({ token_hash, type })`.
 *
 * We allow either pattern to keep deliverability options open without breaking builds.
 */
function assertAuthLinkPlaceholders(templateId: string, html: string): void {
  const hasConfirmationUrl = html.includes('{{ .ConfirmationURL }}')
  if (hasConfirmationUrl) return

  // First-party token hash flow.
  // NOTE: we use RedirectTo so preview/staging can redirect to the correct origin.
  const required = ['{{ .RedirectTo }}', '{{ .TokenHash }}', '{{ .Type }}']
  const missing = required.filter((needle) => !html.includes(needle))
  if (missing.length > 0) {
    throw new Error(
      `Template ${templateId} is missing required placeholders for auth link: ${missing.join(', ')}`,
    )
  }
}

/**
 * Normalizes MJML error output into a readable string for CI and local runs.
 */
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

async function readSupabaseOtpExpirySeconds(repoRoot: string): Promise<number> {
  const configPath = path.join(repoRoot, 'supabase/config.toml')
  let config: string
  try {
    config = await readFile(configPath, 'utf8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed reading Supabase config at ${configPath}: ${message}`)
  }

  const match = config.match(/^\s*otp_expiry\s*=\s*(\d+)\s*$/m)
  if (!match) {
    throw new Error(`Failed to find otp_expiry in Supabase config at ${configPath}`)
  }

  const seconds = Number(match[1])
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Invalid otp_expiry value in ${configPath}: ${String(match[1])}`)
  }

  return seconds
}

function formatDurationPtBr(seconds: number): string {
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600
    return hours === 1 ? '1 hora' : `${hours} horas`
  }

  if (seconds % 60 === 0) {
    const minutes = seconds / 60
    return minutes === 1 ? '1 minuto' : `${minutes} minutos`
  }

  return seconds === 1 ? '1 segundo' : `${seconds} segundos`
}

/**
 * Builds all Supabase email templates (MJML → HTML) and writes them to `supabase/templates/`.
 */
async function buildSupabaseTemplates(): Promise<void> {
  const repoRoot = process.cwd()

  const otpExpirySeconds = await readSupabaseOtpExpirySeconds(repoRoot)
  const otpExpiryText = formatDurationPtBr(otpExpirySeconds)

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

    // MJML occasionally emits incomplete style attributes (e.g. `style width="100%"` instead of `style="width:100%"`).
    // This breaks rendering in some email clients, so we normalize to the correct format.
    let html = result.html
    html = html.replaceAll('style width="100%"', 'style="width:100%" width="100%"')

    // Guardrail: ensure core Supabase placeholders are still present after compilation.
    // This prevents broken emails where the user can't click a link / enter a code.
    try {
      if (template.kind === 'auth') {
        if (template.type === 'reauthentication') {
          assertIncludes(templateId, html, '{{ .Token }}')
        } else {
          assertAuthLinkPlaceholders(templateId, html)
        }

        if (template.type === 'magic_link') {
          // Keep copy in sync with Supabase `otp_expiry` (seconds) in `supabase/config.toml`.
          assertIncludes(templateId, html, `Este link expira em ${otpExpiryText}.`)
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

async function buildCustomTemplates(): Promise<void> {
  const repoRoot = process.cwd()
  const failures: Array<{ templateId: string; error: string }> = []

  for (const template of CUSTOM_EMAIL_TEMPLATES) {
    const sourcePath = path.join(repoRoot, template.mjmlPath)
    const outputPath = path.join(repoRoot, template.htmlPath)

    const mjml = await readFile(sourcePath, 'utf8')

    const result = mjml2html(mjml, {
      filePath: path.dirname(sourcePath),
      validationLevel: 'strict',
    })

    const mjmlErrors = formatMjmlErrors(result.errors)
    if (mjmlErrors) {
      failures.push({ templateId: template.id, error: mjmlErrors })
      continue
    }

    await mkdir(path.dirname(outputPath), { recursive: true })

    let html = result.html
    html = html.replaceAll('style width="100%"', 'style="width:100%" width="100%"')

    await writeFile(outputPath, html, 'utf8')

    if (template.id === 'custom.welcome') {
      const tsOutputPath = path.join(
        repoRoot,
        'supabase/functions/send-welcome-email/welcome-template.ts',
      )
      const tsContent = `export const welcomeTemplate = ${JSON.stringify(html)};\n`
      await writeFile(tsOutputPath, tsContent, 'utf8')
    }
  }

  if (failures.length > 0) {
    const message = failures
      .map((f) => `\n---\n${f.templateId}\n${f.error}`)
      .join('')

    throw new Error(`MJML compilation failed for ${failures.length} template(s).${message}`)
  }
}

async function buildAllTemplates(): Promise<void> {
  await buildSupabaseTemplates()
  await buildCustomTemplates()
}

buildAllTemplates().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(message)
  process.exitCode = 1
})


