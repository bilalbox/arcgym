import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-miro-primary text-white shadow-2xs hover:bg-miro-charcoal active:bg-black",
        destructive:
          "bg-rose-600 text-white shadow-2xs hover:bg-rose-700",
        outline:
          "border border-miro-hairlineStrong bg-transparent text-miro-primary hover:bg-miro-surfaceSoft hover:border-slate-400",
        secondary:
          "border border-miro-hairline bg-white text-miro-primary hover:bg-miro-surface hover:border-slate-300",
        ghost:
          "hover:bg-miro-surface text-miro-primary",
        link:
          "text-miro-blue underline-offset-4 hover:underline hover:text-miro-blueDeep p-0 h-auto",
        confidencePill:
          "border border-miro-hairline bg-white text-miro-primary hover:border-slate-400 data-[selected=true]:border-miro-primary data-[selected=true]:bg-miro-primary data-[selected=true]:text-white",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
