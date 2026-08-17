import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
	{
		variants: {
			variant: {
				default: "bg-primary/15 text-primary",
				secondary: "bg-secondary text-secondary-foreground",
				success: "bg-emerald-500/15 text-emerald-500",
				warning: "bg-amber-500/15 text-amber-500",
				destructive: "bg-destructive/15 text-destructive",
				outline: "border border-border text-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
	VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<span className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}
