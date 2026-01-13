/**
 * Unit tests for NotificationItem component.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NotificationItem } from './notification-item'
import type { Notification } from '@/types'

function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'welcome',
    title: 'Test Notification',
    body: 'This is a test notification body',
    primaryActionLabel: null,
    primaryActionHref: null,
    dedupeKey: null,
    readAt: null,
    emailSentAt: null,
    createdAt: new Date('2025-01-15T12:00:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z'),
    ...overrides,
  }
}

function renderNotificationItem(
  notification: Notification,
  onMarkAsRead = vi.fn()
) {
  return render(
    <MemoryRouter>
      <NotificationItem notification={notification} onMarkAsRead={onMarkAsRead} />
    </MemoryRouter>
  )
}

describe('NotificationItem', () => {
  describe('rendering', () => {
    it('renders notification title and body', () => {
      const notification = createMockNotification({
        title: 'Welcome!',
        body: 'Thanks for joining',
      })
      renderNotificationItem(notification)

      expect(screen.getByText('Welcome!')).toBeInTheDocument()
      expect(screen.getByText('Thanks for joining')).toBeInTheDocument()
    })

    it('renders primary action button when present', () => {
      const notification = createMockNotification({
        primaryActionLabel: 'Get Started',
        primaryActionHref: '/manage',
      })
      renderNotificationItem(notification)

      const actionButton = screen.getByRole('link', { name: 'Get Started' })
      expect(actionButton).toBeInTheDocument()
      expect(actionButton).toHaveAttribute('href', '/manage')
    })

    it('does not render primary action button when absent', () => {
      const notification = createMockNotification({
        primaryActionLabel: null,
        primaryActionHref: null,
      })
      renderNotificationItem(notification)

      expect(screen.queryByRole('link', { name: /get started/i })).not.toBeInTheDocument()
    })

    it('renders "Marcar como lida" button for unread notifications', () => {
      const notification = createMockNotification({ readAt: null })
      renderNotificationItem(notification)

      expect(screen.getByRole('button', { name: /marcar como lida/i })).toBeInTheDocument()
    })

    it('does not render "Marcar como lida" button for read notifications', () => {
      const notification = createMockNotification({ readAt: new Date() })
      renderNotificationItem(notification)

      expect(screen.queryByRole('button', { name: /marcar como lida/i })).not.toBeInTheDocument()
    })
  })

  describe('mark as read', () => {
    it('calls onMarkAsRead when "Marcar como lida" button is clicked', async () => {
      const user = userEvent.setup()
      const onMarkAsRead = vi.fn()
      const notification = createMockNotification({ id: 'notif-123', readAt: null })
      renderNotificationItem(notification, onMarkAsRead)

      await user.click(screen.getByRole('button', { name: /marcar como lida/i }))

      expect(onMarkAsRead).toHaveBeenCalledTimes(1)
      expect(onMarkAsRead).toHaveBeenCalledWith('notif-123')
    })

    it('calls onMarkAsRead when primary action button is clicked on unread notification', async () => {
      const user = userEvent.setup()
      const onMarkAsRead = vi.fn()
      const notification = createMockNotification({
        id: 'notif-456',
        readAt: null,
        primaryActionLabel: 'View Details',
        primaryActionHref: '/details',
      })
      renderNotificationItem(notification, onMarkAsRead)

      await user.click(screen.getByRole('link', { name: 'View Details' }))

      expect(onMarkAsRead).toHaveBeenCalledTimes(1)
      expect(onMarkAsRead).toHaveBeenCalledWith('notif-456')
    })

    it('does not call onMarkAsRead when primary action is clicked on already read notification', async () => {
      const user = userEvent.setup()
      const onMarkAsRead = vi.fn()
      const notification = createMockNotification({
        id: 'notif-789',
        readAt: new Date(), // Already read
        primaryActionLabel: 'View Details',
        primaryActionHref: '/details',
      })
      renderNotificationItem(notification, onMarkAsRead)

      await user.click(screen.getByRole('link', { name: 'View Details' }))

      expect(onMarkAsRead).not.toHaveBeenCalled()
    })
  })
})

