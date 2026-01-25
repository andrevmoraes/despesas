import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-none border-2 border-transparent px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:ring-offset-2 hover:opacity-[var(--state-hover-opacity)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white",
        secondary:
          "bg-[var(--secondary)] text-white",
        destructive:
          "bg-[var(--danger)] text-white",
        outline: "border-[var(--border-strong)] text-[var(--text-primary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
