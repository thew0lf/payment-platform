import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 touch-manipulation active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-foreground hover:bg-primary active:bg-primary/90',
        destructive: 'bg-red-500 text-foreground hover:bg-red-400 active:bg-red-600',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground active:bg-muted/80',
        secondary: 'bg-muted text-foreground hover:bg-muted hover:text-foreground active:bg-muted/80',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 min-h-[44px] px-4 py-2',
        sm: 'h-9 min-h-[36px] px-3 text-xs',
        lg: 'h-12 min-h-[48px] px-6 text-base',
        icon: 'h-10 w-10 min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
