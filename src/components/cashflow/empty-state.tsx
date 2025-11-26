/**
 * Empty state component for when no financial data exists.
 * Provides guidance on how to get started.
 */

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function EmptyState() {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'min-h-[400px] rounded-xl border border-dashed border-border',
        'bg-card p-8 text-center'
      )}
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-muted p-4">
        <svg
          aria-hidden="true"
          focusable="false"
          className="h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
          />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No Financial Data Yet
      </h2>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-6">
        Start by adding your bank accounts, income sources, and expenses to see
        your 30-day cashflow projection.
      </p>

      {/* CTA Button */}
      <Button asChild size="lg" className="mb-6">
        <Link to="/manage">Get Started</Link>
      </Button>

      {/* Action hints */}
      <div className="flex flex-col sm:flex-row gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
            1
          </span>
          <span>Add accounts</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
            2
          </span>
          <span>Set up income</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
            3
          </span>
          <span>Add expenses</span>
        </div>
      </div>
    </div>
  )
}

