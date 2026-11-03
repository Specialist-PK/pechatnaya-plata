import { describe, expect, it, vi } from 'vitest'
import { Fragment } from './jsx-runtime'

describe('DOM JSX runtime', () => {
  it('creates real DOM elements and attaches event handlers', () => {
    const onClick = vi.fn()
    const button = <button class="action" type="button" onClick={onClick}>Открыть</button> as HTMLButtonElement
    expect(button).toBeInstanceOf(HTMLButtonElement)
    expect(button.className).toBe('action')
    expect(button.textContent).toBe('Открыть')
    button.click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('appends nested children through fragments', () => {
    const fragment = <Fragment>{['Первый', <strong>Второй</strong>, null, false]}</Fragment>
    const container = document.createElement('div')
    container.append(fragment)
    expect(container.textContent).toBe('ПервыйВторой')
    expect(container.querySelector('strong')?.textContent).toBe('Второй')
  })
})
