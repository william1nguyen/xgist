import { Gem } from "lucide-react";

type BalanceCardProps = {
	label: string;
	amount: number;
	variant?: "default" | "spent";
};

export default function BalanceCard({
	label,
	amount,
	variant = "default",
}: BalanceCardProps) {
	return (
		<div
			className={[
				"flex flex-col gap-2 rounded-xl border p-5",
				variant === "spent"
					? "border-border bg-gradient-to-br from-muted/60 to-muted/20"
					: "border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5",
			].join(" ")}
		>
			<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
				{label}
			</p>
			<div className="flex items-end gap-2">
				<Gem
					className={`h-5 w-5 ${variant === "spent" ? "text-muted-foreground" : "text-primary"}`}
				/>
				<span className="font-bold text-3xl tabular-nums">{amount}</span>
				<span className="mb-0.5 text-muted-foreground text-sm">credits</span>
			</div>
		</div>
	);
}
