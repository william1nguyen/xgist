import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";

type CreditSummaryProps = {
	totalCost: number;
	balance: number;
};

function useAnimatedCount(target: number): number {
	const [displayed, setDisplayed] = useState(target);
	const prev = useRef(target);

	useEffect(() => {
		const start = prev.current;
		const diff = target - start;
		if (diff === 0) return;
		const duration = 300;
		const startTime = performance.now();

		const tick = (now: number) => {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			setDisplayed(Math.round(start + diff * progress));
			if (progress < 1) requestAnimationFrame(tick);
			else prev.current = target;
		};

		requestAnimationFrame(tick);
	}, [target]);

	return displayed;
}

export default function CreditSummary({
	totalCost,
	balance,
}: CreditSummaryProps) {
	const animatedCost = useAnimatedCount(totalCost);
	const insufficient = totalCost > balance;
	const approaching = !insufficient && balance - totalCost < 20;

	const costColor = insufficient
		? "text-red-400"
		: approaching
			? "text-amber-400"
			: "text-foreground";

	return (
		<div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">Total cost:</span>
				<span
					className={`font-semibold text-sm tabular-nums transition-colors ${costColor}`}
				>
					{animatedCost} credits
				</span>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-xs">
					Balance: {balance}c
				</span>
				{insufficient && (
					<NavLink
						to="/billing"
						className="font-medium text-primary text-xs underline-offset-2 hover:underline"
					>
						Top up
					</NavLink>
				)}
			</div>
		</div>
	);
}
