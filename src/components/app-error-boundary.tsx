import React from 'react'
import { Button } from '@/components/ui/button'
import { StatusScreen } from '@/components/status/status-screen'
import { AlertTriangle } from 'lucide-react'
import { captureEvent } from '@/lib/analytics/posthog'
import { captureSentryException } from '@/lib/observability/sentry'

type AppErrorBoundaryProps = {
  children: React.ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
  error?: Error
}

const IS_DEV = import.meta.env.DEV

/**
 * Top-level error boundary to prevent "white screen of death" on unexpected runtime errors.
 * In DEV we show the error message to speed up debugging.
 */
export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info)
    captureEvent('app_error_boundary_triggered', {
      error_name: error.name,
    })
    captureSentryException(error, {
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const message =
      IS_DEV && this.state.error
        ? this.state.error.message
        : 'Ocorreu um erro inesperado. Tente recarregar a página.'

    return (
      <StatusScreen
        tone="error"
        title="Algo deu errado"
        description={<span className="break-words">{message}</span>}
        illustration={{
          animationLoader: () => import('@/assets/lottie/snapshot-empty.json'),
          ariaLabel: 'Ilustração de erro',
          staticFallback: <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />,
        }}
        primaryAction={<Button onClick={this.handleReload}>Recarregar</Button>}
        footer={IS_DEV ? 'Dica: abra o console para ver mais detalhes do erro.' : 'Se persistir, tente novamente mais tarde.'}
      />
    )
  }
}


