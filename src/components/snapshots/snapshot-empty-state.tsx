/**
 * Empty state component for when no snapshots exist.
 * Explains how to save snapshots and provides guidance.
 */

import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LottieIllustration } from '@/components/illustrations/lottie-illustration'
import { CameraIcon } from '@radix-ui/react-icons'

const snapshotAnimation = () => import('@/assets/lottie/snapshot-empty.json')

export function SnapshotEmptyState() {
  return (
    <Card className="p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <LottieIllustration
            animationLoader={snapshotAnimation}
            staticFallback={<CameraIcon className="w-8 h-8 text-muted-foreground" />}
            className="h-10 w-10"
            ariaLabel="Ilustração de captura de projeções"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium text-foreground">
            Nenhuma projeção salva
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Projeções salvas permitem que você guarde o estado atual da sua projeção
            financeira para consultar depois. É uma ótima forma de acompanhar
            como suas finanças evoluem ao longo do tempo.
          </p>
        </div>

        <div className="pt-2">
          <Link to="/">
            <Button>
              Ir para o Painel
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          No painel, clique em "Salvar Projeção" para criar seu primeiro registro.
        </p>
      </div>
    </Card>
  )
}

