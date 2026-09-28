import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-miro-primary text-miro-onPrimary",
        secondary:
          "border border-miro-hairline bg-miro-surface text-miro-slate",
        outline:
          "border border-miro-hairline bg-miro-card text-miro-slate",
        pillar:
          "border border-miro-lavenderBorder bg-miro-lavenderLight text-miro-lavenderText font-medium",
        domain:
          "border border-miro-hairline bg-miro-card text-miro-slate font-medium",
        teal:
          "border border-miro-tealBorder bg-miro-tealLight text-miro-tealText font-medium",
        rose:
          "border border-miro-roseBorder bg-miro-roseLight text-miro-roseText font-medium",
        yellow:
          "border border-miro-yellowBorder bg-miro-yellowLight text-miro-yellowText font-medium",
        lavender:
          "border border-miro-lavenderBorder bg-miro-lavenderLight text-miro-lavenderText font-medium",
        success:
          "border border-miro-successBorder bg-miro-successLight text-miro-successText font-medium",
        destructive:
          "border border-miro-dangerBorder bg-miro-dangerLight text-miro-dangerText font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
