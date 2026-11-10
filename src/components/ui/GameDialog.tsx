import { useEffect, useRef, type HTMLAttributes } from 'react'

type GameDialogProps = HTMLAttributes<HTMLDivElement> & { onDismiss?: () => void }

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Keep keyboard input inside the foreground menu and restore focus on dismissal. */
export function GameDialog({ onDismiss, children, onKeyDown, ...props }: GameDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.getClientRects().length > 0)
    const frame = window.requestAnimationFrame(() => {
      const preferred = root.querySelector<HTMLElement>('[data-dialog-initial-focus]')
      if (!root.contains(document.activeElement)) (preferred ?? controls()[0] ?? root).focus({ preventScroll: true })
    })
    const handleKeydown = (event: KeyboardEvent) => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
      if (dialogs[dialogs.length - 1] !== root) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismissRef.current?.()
      } else if (event.key === 'Tab') {
        const items = controls()
        const index = items.indexOf(document.activeElement as HTMLElement)
        if (!items.length || index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
          event.preventDefault()
          const target = event.shiftKey ? items[items.length - 1] ?? root : items[0] ?? root
          target.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeydown, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeydown, true)
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div {...props} ref={rootRef} role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={(event) => {
      event.stopPropagation()
      const target = event.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) && ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.getClientRects().length > 0)
        if (controls.length) {
          event.preventDefault()
          const index = controls.indexOf(document.activeElement as HTMLElement)
          const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
          const nextIndex = index < 0 ? (direction > 0 ? 0 : controls.length - 1) : (index + direction + controls.length) % controls.length
          const next = controls[nextIndex]
          next.focus()
          next.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }
      }
      onKeyDown?.(event)
    }}>
      {children}
    </div>
  )
}
