export type SupabaseAuthEmailTemplateType =
  | 'invite'
  | 'confirmation'
  | 'recovery'
  | 'magic_link'
  | 'email_change'
  | 'reauthentication'

export type SupabaseSecurityNotificationTemplateType =
  | 'password_changed'
  | 'email_changed'
  | 'phone_changed'
  | 'mfa_factor_enrolled'
  | 'mfa_factor_unenrolled'
  | 'identity_linked'
  | 'identity_unlinked'

export type SupabaseEmailTemplate =
  | {
      kind: 'auth'
      type: SupabaseAuthEmailTemplateType
      subject: string
      /**
       * MJML source file path, relative to repo root.
       */
      mjmlPath: string
      /**
       * Generated HTML output file path, relative to repo root.
       */
      htmlPath: string
      /**
       * Supabase GoTemplate variables used by this template.
       * See: https://supabase.com/docs/guides/auth/auth-email-templates
       */
      variables: string[]
    }
  | {
      kind: 'notification'
      type: SupabaseSecurityNotificationTemplateType
      enabledByDefault: boolean
      subject: string
      mjmlPath: string
      htmlPath: string
      variables: string[]
    }

/**
 * Canonical mapping of Supabase email template types → MJML sources → generated HTML outputs.
 *
 * - `auth.*` templates are always available, but may not be used depending on your auth config.
 * - `notification.*` templates are only sent if that notification type is enabled at project-level.
 */
export const SUPABASE_EMAIL_TEMPLATES: SupabaseEmailTemplate[] = [
  // ---------------------------------------------------------------------------
  // Auth templates
  // ---------------------------------------------------------------------------
  {
    kind: 'auth',
    type: 'magic_link',
    subject: 'Seu link de acesso — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/auth/magic_link.mjml',
    htmlPath: 'supabase/templates/magic_link.html',
    variables: ['ConfirmationURL', 'Email', 'SiteURL', 'RedirectTo'],
  },
  {
    kind: 'auth',
    type: 'invite',
    subject: 'Você foi convidado — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/auth/invite.mjml',
    htmlPath: 'supabase/templates/invite.html',
    variables: ['ConfirmationURL', 'Email', 'SiteURL', 'RedirectTo'],
  },
  {
    kind: 'auth',
    type: 'confirmation',
    subject: 'Confirme seu cadastro — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/auth/confirmation.mjml',
    htmlPath: 'supabase/templates/confirmation.html',
    variables: ['ConfirmationURL', 'Email', 'SiteURL', 'RedirectTo'],
  },
  {
    kind: 'auth',
    type: 'recovery',
    subject: 'Redefinir sua senha — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/auth/recovery.mjml',
    htmlPath: 'supabase/templates/recovery.html',
    variables: ['ConfirmationURL', 'Email', 'SiteURL', 'RedirectTo'],
  },
  {
    kind: 'auth',
    type: 'email_change',
    subject: 'Confirme a troca de e-mail — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/auth/email_change.mjml',
    htmlPath: 'supabase/templates/email_change.html',
    variables: ['ConfirmationURL', 'Email', 'NewEmail', 'SiteURL', 'RedirectTo'],
  },
  {
    kind: 'auth',
    type: 'reauthentication',
    subject: 'Código de verificação — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/auth/reauthentication.mjml',
    htmlPath: 'supabase/templates/reauthentication.html',
    variables: ['Token', 'Email', 'SiteURL'],
  },

  // ---------------------------------------------------------------------------
  // Security notification templates
  // ---------------------------------------------------------------------------
  {
    kind: 'notification',
    type: 'password_changed',
    enabledByDefault: false,
    subject: 'Sua senha foi alterada — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/notifications/password_changed.mjml',
    htmlPath: 'supabase/templates/password_changed_notification.html',
    variables: ['Email', 'SiteURL'],
  },
  {
    kind: 'notification',
    type: 'email_changed',
    enabledByDefault: false,
    subject: 'Seu e-mail foi alterado — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/notifications/email_changed.mjml',
    htmlPath: 'supabase/templates/email_changed_notification.html',
    variables: ['OldEmail', 'Email', 'SiteURL'],
  },
  {
    kind: 'notification',
    type: 'phone_changed',
    enabledByDefault: false,
    subject: 'Seu telefone foi alterado — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/notifications/phone_changed.mjml',
    htmlPath: 'supabase/templates/phone_changed_notification.html',
    variables: ['OldPhone', 'Phone', 'Email', 'SiteURL'],
  },
  {
    kind: 'notification',
    type: 'mfa_factor_enrolled',
    enabledByDefault: false,
    subject: 'Novo método de MFA adicionado — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/notifications/mfa_factor_enrolled.mjml',
    htmlPath: 'supabase/templates/mfa_factor_enrolled_notification.html',
    variables: ['FactorType', 'Email', 'SiteURL'],
  },
  {
    kind: 'notification',
    type: 'mfa_factor_unenrolled',
    enabledByDefault: false,
    subject: 'Método de MFA removido — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/notifications/mfa_factor_unenrolled.mjml',
    htmlPath: 'supabase/templates/mfa_factor_unenrolled_notification.html',
    variables: ['FactorType', 'Email', 'SiteURL'],
  },
  {
    kind: 'notification',
    type: 'identity_linked',
    enabledByDefault: false,
    subject: 'Nova identidade vinculada — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/notifications/identity_linked.mjml',
    htmlPath: 'supabase/templates/identity_linked_notification.html',
    variables: ['Provider', 'Email', 'SiteURL'],
  },
  {
    kind: 'notification',
    type: 'identity_unlinked',
    enabledByDefault: false,
    subject: 'Identidade desvinculada — Fluxo Certo',
    mjmlPath: 'emails/mjml/supabase/notifications/identity_unlinked.mjml',
    htmlPath: 'supabase/templates/identity_unlinked_notification.html',
    variables: ['Provider', 'Email', 'SiteURL'],
  },
]


