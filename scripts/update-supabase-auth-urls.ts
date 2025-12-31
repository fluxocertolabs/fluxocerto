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
  return withProtocol.replace(/\/+$/, '')
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
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    if (seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

function isStringAllowListKey(key: string): boolean {
  const normalized = key.toLowerCase()
  return normalized.includes('uri_allow_list') || normalized === 'uri_allow_list' || normalized === 'uri-allow-list'
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

  // Fetch current config so we can patch only supported keys (avoids 400s on unknown fields).
  const getRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!getRes.ok) {
    const text = await getRes.text()
    throw new Error(`Supabase Management API GET error (${getRes.status}): ${text}`)
  }

  const config = (await getRes.json()) as Record<string, unknown>

  const redirectKeys = [
    'additional_redirect_urls',
    'uri_allow_list',
    'redirect_urls',
    'URI_ALLOW_LIST',
    'ADDITIONAL_REDIRECT_URLS',
  ] as const

  const redirectKey = redirectKeys.find((key) => key in config)
  if (!redirectKey) {
    // Dump keys to help debugging in CI logs (no secrets).
    const keys = Object.keys(config).sort()
    throw new Error(
      `Could not find a redirect allow-list field in Supabase auth config. Keys present: ${keys.join(', ')}`
    )
  }

  const existingRaw = config[redirectKey]
  const existing = toStringArray(existingRaw)
  const next = unique([...existing, previewUrl, previewConfirmUrl])

  const shouldSendString =
    typeof existingRaw === 'string' || isStringAllowListKey(redirectKey)

  // GoTrue's `URI_ALLOW_LIST` environment variable is a comma-separated list.
  // The Supabase Management API expects the raw string value for `uri_allow_list`.
  const patchValue: unknown = shouldSendString ? next.join(',') : next

  const patchPayload: Record<string, unknown> = {
    [redirectKey]: patchValue,
  }

  const patchOnce = async (payload: Record<string, unknown>) => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text }
  }

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
    throw new Error(`Supabase Management API PATCH error (${patchResult.status}): ${patchResult.text}`)
  }

  console.log(
    JSON.stringify(
      {
        projectRef,
        updatedField: redirectKey,
        added: [previewUrl, previewConfirmUrl],
        sentValueType: typeof patchValue,
        totalRedirectUrls: next.length,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(message)
  process.exitCode = 1
})


