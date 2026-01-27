import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { LoginPage } from './login'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location-display">{location.search}</div>
}

function renderLogin(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/login"
          element={
            <>
              <LoginPage />
              <LocationDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  it('defaults to signup copy when no intent param is provided', () => {
    renderLogin('/login')

    expect(screen.getByText('Comece seu teste grátis de 14 dias')).toBeInTheDocument()
    expect(
      screen.getByText('Digite seu e-mail para receber um link de acesso. Sem senha, sem cartão.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /começar agora/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()
  })

  it('renders login copy when intent=login', () => {
    renderLogin('/login?intent=login')

    expect(screen.getByText('Entrar na sua conta')).toBeInTheDocument()
    expect(screen.getByText('Digite seu e-mail para receber um link de acesso.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar link de acesso/i })).toBeInTheDocument()
    expect(screen.getByText('Não tem conta?')).toBeInTheDocument()
  })

  it('toggles mode and updates the URL without reload', async () => {
    const user = userEvent.setup()
    renderLogin('/login?intent=login')

    expect(screen.getByTestId('location-display')).toHaveTextContent('intent=login')

    await user.click(screen.getByRole('button', { name: /comece grátis por 14 dias/i }))

    expect(screen.getByText('Comece seu teste grátis de 14 dias')).toBeInTheDocument()
    expect(screen.getByTestId('location-display')).toHaveTextContent('intent=signup')
  })
})
