import * as React from 'react'
import { cn } from '@/lib/utils'

interface CollapsibleContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null)

function useCollapsible() {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error('Collapsible components must be used within a Collapsible')
  }
  return context
}

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}

function Collapsible({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  className,
  children,
  ...props
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [isControlled, onOpenChange])

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

function CollapsibleTrigger({
  asChild,
  className,
  children,
  onClick,
  ...props
}: CollapsibleTriggerProps) {
  const { open, onOpenChange } = useCollapsible()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onOpenChange(!open)
    onClick?.(e)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
      onClick: handleClick,
    })
  }

  return (
    <button
      type="button"
      aria-expanded={open}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}

type CollapsibleContentProps = React.HTMLAttributes<HTMLDivElement>

function CollapsibleContent({
  className,
  children,
  ...props
}: CollapsibleContentProps) {
  const { open } = useCollapsible()

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200',
        open ? 'animate-in fade-in-0' : 'hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

