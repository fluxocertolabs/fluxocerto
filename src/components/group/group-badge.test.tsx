import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupBadge } from './group-badge'

describe('GroupBadge', () => {
  it('renders the group name and provides a safe truncation container', () => {
    const name = 'Grupo com nome extremamente longo para testar truncamento no layout móvel'
    render(<GroupBadge name={name} />)

    const badge = screen.getByTestId('group-badge')
    expect(badge).toHaveAttribute('title', name)
    expect(badge).toHaveClass('min-w-0')

    const text = badge.querySelector('span')
    expect(text).not.toBeNull()
    expect(text).toHaveClass('truncate')
    expect(text).toHaveTextContent(name)
  })
})





