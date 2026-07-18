import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_20px_-6px] shadow-primary/50 hover:brightness-110",
        outline:
          "border border-foreground/15 bg-transparent hover:bg-foreground/8 hover:border-foreground/25",
        ghost: "hover:bg-foreground/8",
        accent: "bg-accent text-accent-foreground hover:brightness-125",
        danger: "bg-danger text-white hover:opacity-90",
        retro:
          "font-departure uppercase tracking-[0.14em] border border-dashed border-foreground/15 bg-transparent text-muted-foreground hover:border-foreground/30 hover:bg-foreground/5 hover:text-foreground",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
