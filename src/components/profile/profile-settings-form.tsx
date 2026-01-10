/**
 * Profile settings form component.
 * 
 * Allows users to:
 * - Update their display name
 * - View their email (read-only)
 * - Toggle email notifications preference
 */

import { useState, useEffect } from 'react'
import { Loader2, Mail, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import type { ProfileData } from '@/hooks/use-profile'
import type { Result } from '@/stores/finance-store'

interface ProfileSettingsFormProps {
  profile: ProfileData
  onUpdateName: (name: string) => Promise<Result<void>>
  onUpdateEmailNotifications: (enabled: boolean) => Promise<Result<void>>
}

export function ProfileSettingsForm({
  profile,
  onUpdateName,
  onUpdateEmailNotifications,
}: ProfileSettingsFormProps) {
  const [name, setName] = useState(profile.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(
    profile.emailNotificationsEnabled
  )
  const [isSavingEmail, setIsSavingEmail] = useState(false)

  // Sync name with profile when it changes externally
  useEffect(() => {
    setName(profile.name)
  }, [profile.name])

  // Sync email notifications with profile when it changes externally
  useEffect(() => {
    setEmailNotifications(profile.emailNotificationsEnabled)
  }, [profile.emailNotificationsEnabled])

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError(null)
    setNameSaved(false)

    // Validate
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Nome é obrigatório')
      return
    }
    if (trimmedName.length > 100) {
      setNameError('Nome deve ter no máximo 100 caracteres')
      return
    }

    // Don't save if unchanged
    if (trimmedName === profile.name) {
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
      return
    }

    setIsSavingName(true)
    const result = await onUpdateName(trimmedName)
    setIsSavingName(false)

    if (!result.success) {
      setNameError(result.error ?? 'Falha ao salvar nome')
    } else {
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    }
  }

  const handleEmailNotificationsChange = async (checked: boolean) => {
    setEmailNotifications(checked)
    setIsSavingEmail(true)
    const result = await onUpdateEmailNotifications(checked)
    setIsSavingEmail(false)

    if (!result.success) {
      // Revert on failure
      setEmailNotifications(!checked)
    }
  }

  return (
    <div className="space-y-6">
      {/* Display Name Section */}
      <Card className="p-6">
        <form onSubmit={handleNameSubmit}>
          <div className="flex items-start gap-4 mb-4">
            <div className="rounded-full bg-primary/10 p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-foreground">
                Nome de exibição
              </h3>
              <p className="text-sm text-muted-foreground">
                Como você será identificado no aplicativo
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError(null)
                setNameSaved(false)
              }}
              placeholder="Seu nome"
              maxLength={100}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
            />
            {nameError && (
              <p id="name-error" className="text-sm text-destructive">
                {nameError}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button type="submit" disabled={isSavingName}>
              {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nome
            </Button>
            {nameSaved && (
              <span className="text-sm text-green-600 dark:text-green-400">
                ✓ Salvo
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Email Section (Read-only) */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="rounded-full bg-muted p-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-foreground">
              Email
            </h3>
            <p className="text-sm text-muted-foreground">
              Seu email de autenticação (não pode ser alterado)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="bg-muted cursor-not-allowed"
            aria-describedby="email-hint"
          />
          <p id="email-hint" className="text-xs text-muted-foreground">
            O email é usado para autenticação e não pode ser alterado. Entre em contato com o suporte se precisar mudar seu email.
          </p>
        </div>
      </Card>

      {/* Email Notifications Section */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Notificações por email
                </h3>
                <p className="text-sm text-muted-foreground">
                  Receba notificações importantes por email
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSavingEmail && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={handleEmailNotificationsChange}
                  disabled={isSavingEmail}
                  aria-label="Ativar notificações por email"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {emailNotifications
                ? 'Você receberá emails sobre notificações importantes.'
                : 'Você não receberá emails de notificações.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

