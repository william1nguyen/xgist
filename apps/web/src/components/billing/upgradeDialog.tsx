import type { BillingPlan, PlanTier } from "@media-notes/api/routers/billing";
import { Check, Crown, X, Zap } from "lucide-react";

type UpgradeDialogProps = {
	currentPlan: PlanTier;
	plans: BillingPlan[];
	loadingProductId: string | null;
	onSelect: (productId: string) => void;
	onClose: () => void;
};

function formatPrice(plan: BillingPlan): string {
	if (plan.priceAmount === null || plan.priceCurrency === null) {
		return "Contact us";
	}

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: plan.priceCurrency.toUpperCase(),
	}).format(plan.priceAmount / 100);
}

export default function UpgradeDialog({
	currentPlan,
	plans,
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
					{plans
						.filter((plan) => plan.tier !== "free")
						.map((plan) => {
							const isActive = currentPlan === plan.tier;
							const isLoading = loadingProductId === plan.productId;
							const highlight = plan.tier === "ultimate";
							const icon =
								plan.tier === "ultimate" ? (
									<Crown size={15} />
								) : (
									<Zap size={15} />
								);

							return (
								<div
									key={plan.tier}
									className={[
										"relative flex flex-col gap-4 rounded-xl border p-5 transition-all",
										highlight
											? "border-primary/60 bg-primary/5"
											: "border-border bg-background",
									].join(" ")}
								>
									{highlight && (
										<span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 font-medium text-primary-foreground text-xs">
											Popular
										</span>
									)}

									<div className="flex items-center gap-2">
										<span className="text-primary">{icon}</span>
										<p className="font-semibold">{plan.name}</p>
									</div>

									{plan.description && (
										<p className="text-muted-foreground text-xs">
											{plan.description}
										</p>
									)}

									<div className="flex items-end gap-1">
										<span className="font-bold text-3xl tabular-nums">
											{formatPrice(plan)}
										</span>
										{plan.recurringInterval && (
											<span className="mb-0.5 text-muted-foreground text-sm">
												/ {plan.recurringInterval}
											</span>
										)}
									</div>

									<ul className="flex-1 space-y-1.5">
										{plan.credits > 0 && (
											<li className="flex items-start gap-2 text-muted-foreground text-xs">
												<Check
													size={11}
													className="mt-0.5 shrink-0 text-green-500"
												/>
												{plan.credits.toLocaleString()} credits per billing
												cycle
											</li>
										)}
										{plan.benefits.map((benefit) => (
											<li
												key={benefit}
												className="flex items-start gap-2 text-muted-foreground text-xs"
											>
												<Check
													size={11}
													className="mt-0.5 shrink-0 text-green-500"
												/>
												{benefit}
											</li>
										))}
									</ul>

									{isActive ? (
										<div className="w-full rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-center font-medium text-green-500 text-sm">
											Current plan
										</div>
									) : (
										<button
											type="button"
											disabled={isLoading}
											onClick={() => onSelect(plan.productId)}
											className={[
												"w-full rounded-lg px-4 py-2 font-medium text-sm transition-opacity disabled:opacity-50",
												highlight
													? "bg-primary text-primary-foreground hover:opacity-90"
													: "border border-border hover:bg-muted",
											].join(" ")}
										>
											{isLoading ? "Redirecting..." : `Select ${plan.name}`}
										</button>
									)}
								</div>
							);
						})}
				</div>
			</div>
		</div>
	);
}
