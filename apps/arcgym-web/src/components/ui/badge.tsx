import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-miro-primary text-white",
        secondary:
          "border border-miro-hairline bg-miro-surface text-slate-700",
        outline:
          "border border-miro-hairline bg-white text-slate-700",
        pillar:
          "border border-blue-200/80 bg-blue-50/70 text-blue-900 font-medium",
        domain:
          "border border-miro-hairline bg-white text-slate-700 font-medium",
        teal:
          "border border-teal-200/80 bg-miro-tealLight text-miro-tealText font-medium",
        rose:
          "border border-rose-200/80 bg-miro-roseLight text-miro-roseText font-medium",
        yellow:
          "border border-amber-200/80 bg-miro-yellowLight text-miro-yellowText font-medium",
        lavender:
          "border border-indigo-200/80 bg-miro-lavenderLight text-miro-lavenderText font-medium",
        success:
          "border border-emerald-200/80 bg-miro-successLight text-miro-successText font-medium",
        destructive:
          "border border-rose-200/80 bg-miro-dangerLight text-miro-dangerText font-medium",
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
