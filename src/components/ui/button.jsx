import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 border-transparent rounded-none text-sm font-semibold tracking-wide transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 hover:opacity-[var(--state-hover-opacity)] active:opacity-[var(--state-pressed-opacity)] disabled:pointer-events-none disabled:opacity-[var(--state-disabled-opacity)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white",
        destructive:
          "bg-[var(--danger)] text-white",
        outline:
          "border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        secondary:
          "bg-[var(--secondary)] text-white",
        ghost: "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-subtle)]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
