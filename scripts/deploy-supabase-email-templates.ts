import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { SUPABASE_EMAIL_TEMPLATES } from './emails/supabase-templates'

/**
 * Reads an environment variable and returns a trimmed value if it's non-empty.
 */
function getEnv(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value : undefined
}

/**
 * Reads an environment variable and throws if it's missing/empty.
 */
function requireEnv(name: string): string {
  const value = getEnv(name)
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

/**
 * Deploys MJML-built Supabase email templates to the Supabase Management API.
 *
 * Use `--dry-run` to print the payload keys without sending any request.
 */
async function main(): Promise<void> {
  const repoRoot = process.cwd()

  const isDryRun = process.argv.includes('--dry-run')
  const setNotificationEnabledFlags = process.argv.includes('--set-notification-enabled-flags')

  const projectRef = getEnv('PROJECT_REF') ?? getEnv('SUPABASE_PROJECT_REF')

  const payload: Record<string, unknown> = {}

  for (const template of SUPABASE_EMAIL_TEMPLATES) {
    const templateId = `${template.kind}.${template.type}`
    const htmlPath = path.join(repoRoot, template.htmlPath)
    let html: string
    try {
      html = await readFile(htmlPath, 'utf8')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed reading template ${templateId} at ${htmlPath}: ${message}`)
    }

    if (template.kind === 'auth') {
      payload[`mailer_subjects_${template.type}`] = template.subject
      payload[`mailer_templates_${template.type}_content`] = html
      continue
    }

    // security notification templates
    payload[`mailer_subjects_${template.type}_notification`] = template.subject
    payload[`mailer_templates_${template.type}_notification_content`] = html

    if (setNotificationEnabledFlags) {
      payload[`mailer_notifications_${template.type}_enabled`] = template.enabledByDefault
    }
  }

  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          projectRef: projectRef ?? null,
          keys: Object.keys(payload).sort(),
          notificationEnabledFlagsIncluded: setNotificationEnabledFlags,
        },
        null,
        2
      )
    )
    return
  }

  if (!projectRef) {
    throw new Error('Missing required env var: PROJECT_REF (or SUPABASE_PROJECT_REF)')
  }

  const accessToken = requireEnv('SUPABASE_ACCESS_TOKEN')

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase Management API error (${res.status}): ${text}`)
  }

  console.log(
    `Updated Supabase Auth email templates for project ${projectRef}. (notificationEnabledFlagsIncluded=${String(
      setNotificationEnabledFlags
    )})`
  )
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(message)
  process.exitCode = 1
})


