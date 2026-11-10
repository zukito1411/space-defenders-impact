import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { playGameSound } from '../games/sound'

type GameButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'quiet'
}

export function GameButton({ tone = 'secondary', className = '', children, type = 'button', onClick, ...props }: GameButtonProps) {
  return (
    <button type={type} className={`game-button game-button--${tone} ${className}`} {...props} onClick={(event) => {
      playGameSound('select')
      onClick?.(event)
    }}>
      <span>{children}</span>
    </button>
  )
}

type GameMenuActionProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: ReactNode
  detail?: ReactNode
  primary?: boolean
}

export function GameMenuAction({ label, detail, primary, className = '', onClick, ...props }: GameMenuActionProps) {
  return (
    <button type="button" className={`game-menu-action${primary ? ' game-menu-action--primary' : ''} ${className}`} {...props} onClick={(event) => {
      playGameSound('select')
      onClick?.(event)
    }}>
      <span className="game-menu-action__copy">
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </button>
  )
}
