import type { PlanTier } from "@xgist/api/routers/billing";
import { Check, Crown, Zap } from "lucide-react";

type Plan = {
	tier: PlanTier;
	name: string;
	price: number;
	description: string;
	features: string[];
	icon: React.ReactNode;
	highlight: boolean;
};

const PLANS: Plan[] = [
	{
		tier: "free",
		name: "Free",
		price: 0,
		description: "Get started with 50 welcome credits",
		features: [
			"50 credits on signup",
			"Transcription",
			"Summarization",
			"Keywords extraction",
		],
		icon: null,
		highlight: false,
	},
	{
		tier: "pro",
		name: "Pro",
		price: 20,
		description: "For regular users who process media often",
		features: [
			"500 credits / month",
			"All Free features",
			"Main ideas extraction",
			"Generate notes",
		],
		icon: <Zap size={16} />,
		highlight: true,
	},
	{
		tier: "ultimate",
		name: "Ultimate",
		price: 40,
		description: "Full power with audio summaries",
		features: [
			"1200 credits / month",
			"All Pro features",
			"Audio summary generation",
			"Priority processing",
		],
		icon: <Crown size={16} />,
		highlight: false,
	},
];

type PlanSelectorProps = {
	currentPlan: PlanTier;
	productIdMap: Record<string, string>;
	loadingProductId: string | null;
	onUpgrade: (productId: string) => void;
};

export default function PlanSelector({
	currentPlan,
	productIdMap,
	loadingProductId,
	onUpgrade,
}: PlanSelectorProps) {
	return (
		<div className="space-y-3">
			<h2 className="font-semibold text-sm">Subscription Plan</h2>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{PLANS.map((plan) => {
					const isActive = currentPlan === plan.tier;
					const productId = productIdMap[plan.tier];
					const isLoading =
						productId !== undefined && loadingProductId === productId;
					const canUpgrade =
						!isActive && plan.tier !== "free" && productId !== undefined;

					return (
						<div
							key={plan.tier}
							className={[
								"relative flex flex-col gap-4 rounded-xl border p-5 transition-all",
								isActive
									? "border-primary bg-primary/5 shadow-sm"
									: plan.highlight
										? "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
										: "border-border bg-card hover:-translate-y-0.5 hover:shadow-md",
							].join(" ")}
						>
							{plan.highlight && !isActive && (
								<span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 font-medium text-primary-foreground text-xs">
									Popular
								</span>
							)}

							{isActive && (
								<span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-0.5 font-medium text-white text-xs">
									Current plan
								</span>
							)}

							<div className="space-y-1">
								<div className="flex items-center gap-2">
									{plan.icon && (
										<span
											className={
												isActive ? "text-primary" : "text-muted-foreground"
											}
										>
											{plan.icon}
										</span>
									)}
									<p className="font-semibold">{plan.name}</p>
								</div>
								<p className="text-muted-foreground text-xs">
									{plan.description}
								</p>
							</div>

							<div className="flex items-end gap-1">
								<span className="font-bold text-3xl tabular-nums">
									${plan.price}
								</span>
								{plan.price > 0 && (
									<span className="mb-0.5 text-muted-foreground text-sm">
										/ mo
									</span>
								)}
							</div>

							<ul className="flex-1 space-y-1.5">
								{plan.features.map((f) => (
									<li
										key={f}
										className="flex items-start gap-2 text-muted-foreground text-xs"
									>
										<Check
											size={12}
											className="mt-0.5 shrink-0 text-green-500"
										/>
										{f}
									</li>
								))}
							</ul>

							{canUpgrade ? (
								<button
									type="button"
									disabled={isLoading}
									onClick={() => onUpgrade(productId)}
									className={[
										"w-full rounded-lg px-4 py-2 font-medium text-sm transition-opacity disabled:opacity-50",
										plan.highlight
											? "bg-primary text-primary-foreground hover:opacity-90"
											: "border border-border bg-transparent hover:bg-muted",
									].join(" ")}
								>
									{isLoading ? "Redirecting..." : `Upgrade to ${plan.name}`}
								</button>
							) : isActive ? (
								<div className="w-full rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-center font-medium text-green-500 text-sm">
									Active
								</div>
							) : (
								<div className="w-full rounded-lg px-4 py-2 text-center text-muted-foreground text-sm">
									{plan.tier === "free" ? "Default plan" : "Contact us"}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
