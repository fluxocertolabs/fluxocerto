/**
 * Tawk.to chat URL helper.
 *
 * The in-app support popover uses the public chat URL instead of the embed
 * script. This keeps integration minimal and avoids managing widget state.
 */

function getPropertyId(): string | undefined {
  return import.meta.env.VITE_TAWK_PROPERTY_ID as string | undefined
}

function getWidgetId(): string | undefined {
  return import.meta.env.VITE_TAWK_WIDGET_ID as string | undefined
}

/**
 * Build the public Tawk chat link for the configured widget.
 */
export function getTawkChatUrl(): string | null {
  const propertyId = getPropertyId()
  const widgetId = getWidgetId()
  if (!propertyId || !widgetId) return null
  return `https://tawk.to/chat/${propertyId}/${widgetId}`
}
