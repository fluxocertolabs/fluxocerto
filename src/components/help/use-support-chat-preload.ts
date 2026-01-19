import { useEffect } from 'react'

export function useSupportChatPreload(tawkChatUrl: string | null) {
  useEffect(() => {
    if (!tawkChatUrl) return

    const preloadIframe = document.createElement('iframe')
    preloadIframe.src = tawkChatUrl
    preloadIframe.title = 'Pré-carregamento do chat de suporte'
    preloadIframe.setAttribute('aria-hidden', 'true')
    preloadIframe.tabIndex = -1
    preloadIframe.style.position = 'fixed'
    preloadIframe.style.width = '1px'
    preloadIframe.style.height = '1px'
    preloadIframe.style.opacity = '0'
    preloadIframe.style.pointerEvents = 'none'
    preloadIframe.style.right = '0'
    preloadIframe.style.bottom = '0'
    document.body.appendChild(preloadIframe)

    return () => {
      preloadIframe.remove()
    }
  }, [tawkChatUrl])
}

