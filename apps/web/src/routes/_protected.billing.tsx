import type { CreditTransaction } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import type { PlanTier } from "@xgist/api/routers/billing";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import TransactionRow from "@/components/billing/transactionRow";
import UpgradeDialog from "@/components/billing/upgradeDialog";
import UsageBar from "@/components/billing/usageBar";
import { client, orpc } from "@/utils/orpc";

const PLAN_LABELS: Record<PlanTier, string> = {
	free: "Free",
	pro: "Pro — 1000 credits/mo",
	ultimate: "Ultimate — 2000 credits/mo",
};

export default function BillingPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [showUpgrade, setShowUpgrade] = useState(false);
	const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [allTransactions, setAllTransactions] = useState<CreditTransaction[]>(
		[],
	);

	const checkoutStatus = searchParams.get("checkout");

	useEffect(() => {
		if (checkoutStatus === "success") {
			toast.success("Payment received — credits will appear shortly");
			setSearchParams({}, { replace: true });
		} else if (checkoutStatus === "cancelled") {
			toast.info("Checkout cancelled");
			setSearchParams({}, { replace: true });
		}
	}, [checkoutStatus, setSearchParams]);

	const { data: balanceData } = useQuery(
		orpc.credits.getBalance.queryOptions({ input: {} }),
	);
	const { data: plansData } = useQuery(
		orpc.billing.getPlans.queryOptions({ input: {} }),
	);
	const { data: activePlanData } = useQuery(
		orpc.billing.getActivePlan.queryOptions({ input: {} }),
	);
	const { data: historyData, isFetching } = useQuery({
		...orpc.credits.getHistory.queryOptions({ input: { limit: 10, cursor } }),
		placeholderData: (prev) => prev,
	});

	const balance = balanceData?.balance ?? 0;
	const productIdMap = plansData?.productIdMap ?? {};
	const currentPlan: PlanTier = activePlanData?.plan ?? "free";
	const subscriptionId = activePlanData?.subscriptionId ?? null;
	const cancelAtPeriodEnd = activePlanData?.cancelAtPeriodEnd ?? false;

	const [cancellingPlan, setCancellingPlan] = useState(false);

	const handleSelect = async (productId: string) => {
		setLoadingProductId(productId);
		try {
			if (subscriptionId && !cancelAtPeriodEnd) {
				await client.billing.upgradeSubscription({ subscriptionId, productId });
				toast.success("Plan updated — changes take effect immediately");
				setShowUpgrade(false);
			} else {
				const { checkoutUrl } = await client.billing.createCheckout({
					productId,
				});
				window.location.href = checkoutUrl;
			}
		} catch {
			toast.error("Failed to update plan");
		} finally {
			setLoadingProductId(null);
		}
	};

	const transactions: CreditTransaction[] =
		historyData?.transactions ?? allTransactions;

	const handleCancel = async () => {
		if (!subscriptionId) return;
		if (
			!window.confirm(
				"Cancel your subscription? You'll keep access until the end of the current billing period.",
			)
		)
			return;
		setCancellingPlan(true);
		try {
			await client.billing.cancelSubscription({ subscriptionId });
			toast.success(
				"Subscription cancelled — active until end of billing period",
			);
		} catch {
			toast.error("Failed to cancel subscription");
		} finally {
			setCancellingPlan(false);
		}
	};

	const handleLoadMore = () => {
		if (historyData?.nextCursor) {
			setAllTransactions((prev) => [
				...prev,
				...(historyData.transactions ?? []),
			]);
			setCursor(historyData.nextCursor);
		}
	};

	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
			<h1 className="font-semibold text-xl">Credits & Billing</h1>

			<UsageBar balance={balance} plan={currentPlan} />

			<div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
				<div className="space-y-0.5">
					<p className="text-muted-foreground text-xs uppercase tracking-wider">
						Current plan
					</p>
					<p className="font-semibold">{PLAN_LABELS[currentPlan]}</p>
					{cancelAtPeriodEnd && (
						<p className="text-amber-500 text-xs">
							Cancels at end of billing period
						</p>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setShowUpgrade(true)}
						className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
					>
						{currentPlan === "free" ? "Upgrade" : "Change plan"}
					</button>
					{subscriptionId && (
						<button
							type="button"
							onClick={handleCancel}
							disabled={cancellingPlan}
							className="rounded-lg border border-border px-4 py-2 text-muted-foreground text-sm transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
						>
							{cancellingPlan ? "Cancelling..." : "Cancel plan"}
						</button>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<h2 className="font-semibold text-sm">Payment History</h2>
				<div className="rounded-xl border border-border bg-card px-4">
					{transactions.length === 0 ? (
						<p className="py-6 text-center text-muted-foreground text-sm">
							No payments yet.
						</p>
					) : (
						<div className="divide-y divide-border">
							{transactions.map((tx) => (
								<TransactionRow key={tx.id} transaction={tx} />
							))}
						</div>
					)}
				</div>

				{historyData?.nextCursor && (
					<button
						type="button"
						onClick={handleLoadMore}
						disabled={isFetching}
						className="w-full rounded-lg border border-border py-2 text-muted-foreground text-sm hover:bg-muted disabled:opacity-50"
					>
						{isFetching ? "Loading..." : "Load more"}
					</button>
				)}
			</div>

			{showUpgrade && (
				<UpgradeDialog
					currentPlan={currentPlan}
					productIdMap={productIdMap}
					loadingProductId={loadingProductId}
					onSelect={handleSelect}
					onClose={() => setShowUpgrade(false)}
				/>
			)}
		</div>
	);
}
