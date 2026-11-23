'use client'

interface Props {
  message: string
  children: React.ReactNode
  className?: string
}

export function ConfirmButton({ message, children, className }: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
