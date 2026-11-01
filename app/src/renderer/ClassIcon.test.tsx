// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ClassIcon, CLASS_TOKENS } from './ClassIcon'

afterEach(cleanup)

describe('ClassIcon', () => {
  it('has a symbol for all nine classes', () => {
    expect([...CLASS_TOKENS].sort()).toEqual(
      ['DRUID', 'HUNTER', 'MAGE', 'PALADIN', 'PRIEST', 'ROGUE', 'SHAMAN', 'WARLOCK', 'WARRIOR']
    )
  })

  it.each(['WARRIOR', 'SHAMAN', 'druid'])('renders a labelled badge with a symbol for %s', (token) => {
    render(<ClassIcon token={token} size={28} />)
    const name = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
    const svg = screen.getByRole('img', { name: `${name} icon` })
    expect(svg.getAttribute('width')).toBe('28')
    expect(svg.querySelector('[data-symbol]')!.innerHTML).toContain('<path')
  })

  it('unknown class → question mark badge', () => {
    render(<ClassIcon token="DEATHKNIGHT" />)
    expect(screen.getByRole('img', { name: 'Unknown class icon' }).textContent).toBe('?')
  })
})
