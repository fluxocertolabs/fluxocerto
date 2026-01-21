import React from 'react'
import { BrandSymbol } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { captureEvent } from '@/lib/analytics/posthog'

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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-6 space-y-6">
          <div className="flex justify-center">
            <BrandSymbol className="h-10 w-10 text-foreground" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Algo deu errado</h1>
            <p className="text-muted-foreground break-words">{message}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={this.handleReload}>Recarregar</Button>
          </div>
        </Card>
      </div>
    )
  }
}


