import type { PlanTier } from "@xgist/api/routers/billing";
import { Check, Crown, X, Zap } from "lucide-react";

type PlanDef = {
	tier: Exclude<PlanTier, "free">;
	name: string;
	price: number;
	features: string[];
	icon: React.ReactNode;
	highlight: boolean;
};

const PAID_PLANS: PlanDef[] = [
	{
		tier: "pro",
		name: "Pro",
		price: 20,
		features: [
			"500 credits / month",
			"Transcription + Summarization",
			"Keywords & Main Ideas",
			"Generate notes",
		],
		icon: <Zap size={15} />,
		highlight: false,
	},
	{
		tier: "ultimate",
		name: "Ultimate",
		price: 40,
		features: [
			"1200 credits / month",
			"All Pro features",
			"Audio summary generation",
			"Priority processing",
		],
		icon: <Crown size={15} />,
		highlight: true,
	},
];

type UpgradeDialogProps = {
	currentPlan: PlanTier;
	productIdMap: Record<string, string>;
	loadingProductId: string | null;
	onSelect: (productId: string) => void;
	onClose: () => void;
};

export default function UpgradeDialog({
	currentPlan,
	productIdMap,
	loadingProductId,
	onSelect,
	onClose,
}: UpgradeDialogProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="relative mx-4 w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label="Close"
				>
					<X size={16} />
				</button>

				<div className="mb-6 space-y-1">
					<h2 className="font-semibold text-lg">Upgrade your plan</h2>
					<p className="text-muted-foreground text-sm">
						Choose a plan to unlock more credits each month.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{PAID_PLANS.map((plan) => {
						const productId = productIdMap[plan.tier];
						const isActive = currentPlan === plan.tier;
						const isLoading =
							productId !== undefined && loadingProductId === productId;

						return (
							<div
								key={plan.tier}
								className={[
									"relative flex flex-col gap-4 rounded-xl border p-5 transition-all",
									plan.highlight
										? "border-primary/60 bg-primary/5"
										: "border-border bg-background",
								].join(" ")}
							>
								{plan.highlight && (
									<span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 font-medium text-primary-foreground text-xs">
										Popular
									</span>
								)}

								<div className="flex items-center gap-2">
									<span className="text-primary">{plan.icon}</span>
									<p className="font-semibold">{plan.name}</p>
								</div>

								<div className="flex items-end gap-1">
									<span className="font-bold text-3xl tabular-nums">
										${plan.price}
									</span>
									<span className="mb-0.5 text-muted-foreground text-sm">
										/ mo
									</span>
								</div>

								<ul className="flex-1 space-y-1.5">
									{plan.features.map((f) => (
										<li
											key={f}
											className="flex items-start gap-2 text-muted-foreground text-xs"
										>
											<Check
												size={11}
												className="mt-0.5 shrink-0 text-green-500"
											/>
											{f}
										</li>
									))}
								</ul>

								{isActive ? (
									<div className="w-full rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-center font-medium text-green-500 text-sm">
										Current plan
									</div>
								) : productId ? (
									<button
										type="button"
										disabled={isLoading}
										onClick={() => onSelect(productId)}
										className={[
											"w-full rounded-lg px-4 py-2 font-medium text-sm transition-opacity disabled:opacity-50",
											plan.highlight
												? "bg-primary text-primary-foreground hover:opacity-90"
												: "border border-border hover:bg-muted",
										].join(" ")}
									>
										{isLoading ? "Redirecting..." : `Select ${plan.name}`}
									</button>
								) : (
									<div className="w-full rounded-lg px-4 py-2 text-center text-muted-foreground text-xs">
										Not available
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
