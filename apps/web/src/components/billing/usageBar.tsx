import { Gem } from "lucide-react";

type UsageBarProps = {
	balance: number;
};

export default function UsageBar({ balance }: UsageBarProps) {
	return (
		<div className="rounded-xl border border-border bg-card p-5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Gem size={16} className="text-primary" />
					<span className="font-medium text-sm">Available credits</span>
				</div>
				<span className="font-semibold text-lg tabular-nums">
					{balance.toLocaleString()}
				</span>
			</div>
		</div>
	);
}
