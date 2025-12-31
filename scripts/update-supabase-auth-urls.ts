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

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withProtocol).toString().replace(/\/+$/, '')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Invalid URL: ${withProtocol} (${message})`)
  }
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    // Supabase may return a newline- or comma-separated string depending on API.
    return value
      .split(/\r?\n|,/g)
      .map((v) => v.trim())
      .filter(Boolean)
  }

  return []
}

function unique(list: string[]): string[] {
  return Array.from(new Set(list))
}

function isStringAllowListKey(key: string): boolean {
  const normalized = key.toLowerCase()
  return normalized.includes('uri_allow_list') || normalized === 'uri-allow-list'
}

/**
 * Update the hosted Supabase Auth URL configuration to allow the current Vercel preview deployment.
 *
 * This prevents Supabase from rejecting `emailRedirectTo` and falling back to the project's Site URL.
 */
async function main(): Promise<void> {
  const projectRef = requireEnv('PROJECT_REF')
  const accessToken = requireEnv('SUPABASE_ACCESS_TOKEN')
  const previewUrl = normalizeUrl(requireEnv('PREVIEW_URL'))

  const previewConfirmUrl = `${previewUrl}/auth/confirm`

  const REQUEST_TIMEOUT_MS = 30_000
  const MAX_ATTEMPTS = 5

  const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  const getConfig = async (): Promise<Record<string, unknown>> => {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Supabase Management API GET error (${res.status}): ${text}`)
    }

    return (await res.json()) as Record<string, unknown>
  }

  const patchOnce = async (payload: Record<string, unknown>) => {
    const res = await fetch(apiUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text }
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const config = await getConfig()

    // Supabase appears to expose this allowlist as `uri_allow_list` in practice.
    // Keep `additional_redirect_urls` as a fallback to avoid coupling to an implementation detail.
    const redirectKey = (['uri_allow_list', 'additional_redirect_urls'] as const).find(
      (key) => key in config
    )

    if (!redirectKey) {
      const keys = Object.keys(config).sort()
      throw new Error(
        `Could not find a redirect allow-list field in Supabase auth config. Keys present: ${keys.join(', ')}`
      )
    }

    const existingRaw = config[redirectKey]
    const existing = toStringArray(existingRaw)

    // Skip update if both URLs already exist (avoids unnecessary PATCH + reduces race likelihood).
    if (existing.includes(previewUrl) && existing.includes(previewConfirmUrl)) {
      console.log(
        JSON.stringify(
          {
            projectRef,
            updatedField: redirectKey,
            skipped: true,
            reason: 'Preview URLs already present',
            urls: [previewUrl, previewConfirmUrl],
          },
          null,
          2
        )
      )
      return
    }

    const next = unique([...existing, previewUrl, previewConfirmUrl])
    const shouldSendString = typeof existingRaw === 'string' || isStringAllowListKey(redirectKey)

    // GoTrue's `URI_ALLOW_LIST` environment variable is a comma-separated list.
    // The Supabase Management API expects the raw string value for `uri_allow_list`.
    const patchValue: unknown = shouldSendString ? next.join(',') : next
    const patchPayload: Record<string, unknown> = { [redirectKey]: patchValue }

    let patchResult = await patchOnce(patchPayload)

    // Retry once with alternate representation if API rejects the inferred type.
    if (!patchResult.ok) {
      const wantsString = patchResult.text.includes('Expected string') && !shouldSendString
      const wantsArray = patchResult.text.includes('Expected array') && shouldSendString

      if (wantsString || wantsArray) {
        const alternateValue = wantsString ? next.join(',') : next
        patchResult = await patchOnce({ [redirectKey]: alternateValue })
      }
    }

    if (!patchResult.ok) {
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(
          `Supabase Management API PATCH error after ${MAX_ATTEMPTS} attempts (${patchResult.status}): ${patchResult.text}`
        )
      }
      continue
    }

    // Verify our URLs are still present after PATCH (mitigates concurrent update races).
    const post = await getConfig()
    const postExisting = toStringArray(post[redirectKey])
    const ok = postExisting.includes(previewUrl) && postExisting.includes(previewConfirmUrl)
    if (ok) {
      console.log(
        JSON.stringify(
          {
            projectRef,
            updatedField: redirectKey,
            added: [previewUrl, previewConfirmUrl],
            totalRedirectUrls: next.length,
            attempt,
          },
          null,
          2
        )
      )
      return
    }
  }

  throw new Error(`Failed to verify redirect URL allowlist update after ${MAX_ATTEMPTS} attempts`)

}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(message)
  process.exitCode = 1
})


