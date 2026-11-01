// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { CharacterList } from './CharacterList'
import { fixtureSnapshot, FIXTURE_NOW } from '../../test/snapshot'

afterEach(cleanup)

describe('CharacterList', () => {
  it('shows compact info per character and the total', () => {
    render(<CharacterList snapshot={fixtureSnapshot()} now={FIXTURE_NOW} selectedKey="Firemaw-Thrall" onSelect={vi.fn()} />)
    const thrall = screen.getByRole('button', { name: /Thrall/ })
    expect(thrall.textContent).toContain('Lv 24 · 12g 34s 56c · MF 7')
    expect(thrall.textContent).toContain('seen just now')
    expect(thrall.getAttribute('aria-current')).toBe('true')
    const jaina = screen.getByRole('button', { name: /Jaina/ })
    expect(jaina.textContent).toContain('Lv 10 · 50s')
    expect(jaina.textContent).not.toContain('MF')
    expect(jaina.getAttribute('aria-current')).toBeNull()
    const total = screen.getByRole('contentinfo', { name: 'Total' })
    expect(total.textContent).toContain('12g 84s 56c')
    expect(within(total).getByText('MF 7')).toBeTruthy()
  })

  it('selects a character on click', () => {
    const onSelect = vi.fn()
    render(<CharacterList snapshot={fixtureSnapshot()} now={FIXTURE_NOW} selectedKey="Firemaw-Thrall" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /Jaina/ }))
    expect(onSelect).toHaveBeenCalledWith('Firemaw-Jaina')
  })
})
