import type { PlanTier } from "@xgist/api/routers/billing";
import { Gem } from "lucide-react";

const PLAN_LIMITS: Record<PlanTier, number> = {
	free: 50,
	pro: 500,
	ultimate: 1200,
};

type UsageBarProps = {
	balance: number;
	plan: PlanTier;
};

export default function UsageBar({ balance, plan }: UsageBarProps) {
	const limit = PLAN_LIMITS[plan];
	const used = Math.max(0, limit - balance);
	const pct = Math.min(100, Math.round((balance / limit) * 100));

	const barColor =
		pct > 40 ? "bg-primary" : pct > 15 ? "bg-amber-500" : "bg-red-500";

	return (
		<div className="space-y-3 rounded-xl border border-border bg-card p-5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Gem size={16} className="text-primary" />
					<span className="font-medium text-sm">Credits</span>
				</div>
				<span className="text-muted-foreground text-sm tabular-nums">
					{balance} / {limit}
				</span>
			</div>

			<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					className={`h-full rounded-full transition-all duration-500 ${barColor}`}
					style={{ width: `${pct}%` }}
				/>
			</div>

			<div className="flex items-center justify-between text-muted-foreground text-xs">
				<span>{used} used</span>
				<span>{pct}% remaining</span>
			</div>
		</div>
	);
}
