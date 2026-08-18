import { Check, Coins, Info, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useBillingSummaryQuery,
	useCancelSubscriptionMutation,
	useCreateCheckoutSessionMutation,
	useCreditPacksQuery,
	usePlansQuery,
	usePriceCatalogQuery,
} from "@/graphql/generated/graphql";
import { PROCESSING_OPTIONS } from "@/lib/constants";

function formatPrice(
	amount: number,
	currency: string | null | undefined,
	interval?: string,
): string {
	if (!currency || amount <= 0) return "";
	const formatted = new Intl.NumberFormat(undefined, {
		style: "currency",
		currency,
	}).format(amount / 100);
	return interval ? `${formatted}/${interval}` : formatted;
}

export default function BillingPage() {
	const { t } = useTranslation();
	const {
		data,
		loading,
		refetch: refetchSummary,
	} = useBillingSummaryQuery({
		fetchPolicy: "cache-and-network",
	});
	const summary = data?.billingSummary;
	const isActiveSubscriber = summary?.subscription?.status === "ACTIVE";
	const currentPlanName = isActiveSubscriber
		? summary?.subscription?.plan
		: t("billingPage.freePlan");

	const { data: catalogData, loading: catalogLoading } = usePriceCatalogQuery({
		fetchPolicy: "cache-and-network",
	});
	const creditsByItem = new Map(
		catalogData?.priceCatalog.items.map((item) => [
			item.itemId,
			item.credits,
		]) ?? [],
	);

	const { data: plansData, loading: plansLoading } = usePlansQuery({
		fetchPolicy: "cache-and-network",
	});
	// Free is the default state every account starts on, not something to
	// check out into — excluded here even if Polar has a $0 product
	// standing in for it, so the upgrade picker only ever offers paid
	// plans.
	const upgradablePlans = (plansData?.plans ?? []).filter(
		(plan) => plan.priceAmount > 0,
	);

	const { data: creditPacksData, loading: creditPacksLoading } =
		useCreditPacksQuery({ fetchPolicy: "cache-and-network" });
	const creditPacks = creditPacksData?.creditPacks ?? [];

	const [upgradeOpen, setUpgradeOpen] = useState(false);
	const [topUpOpen, setTopUpOpen] = useState(false);
	const [createCheckoutSession, { loading: checkingOut }] =
		useCreateCheckoutSessionMutation();
	// Tracks which Polar product id (a plan's or a credit pack's — checkout
	// works identically for both) is currently starting checkout, so only
	// that one card's button shows a busy state.
	const [checkingOutProductId, setCheckingOutProductId] = useState<
		string | null
	>(null);

	async function handleCheckout(productId: string) {
		setCheckingOutProductId(productId);
		try {
			const { data: checkoutData } = await createCheckoutSession({
				variables: { planId: productId },
			});
			const checkoutUrl = checkoutData?.createCheckoutSession.checkoutUrl;
			if (checkoutUrl) {
				window.location.href = checkoutUrl;
				return;
			}
			toast.error(t("billingPage.checkoutErrorToast"));
		} catch {
			toast.error(t("billingPage.checkoutErrorToast"));
		} finally {
			setCheckingOutProductId(null);
		}
	}

	const [cancelSubscription, { loading: canceling }] =
		useCancelSubscriptionMutation();
	const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

	async function handleCancelSubscription() {
		try {
			await cancelSubscription();
			await refetchSummary();
			toast.success(t("billingPage.cancelSuccessToast"));
		} catch {
			toast.error(t("billingPage.cancelErrorToast"));
		} finally {
			setCancelConfirmOpen(false);
		}
	}

	return (
		<div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
			<PageHeader
				title={t("billingPage.title")}
				description={t("billingPage.description")}
			/>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<Coins className="size-4 text-primary" />
							{t("billingPage.credits")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{loading && !summary ? (
							<Skeleton className="h-9 w-24" />
						) : (
							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-col gap-1">
									<p className="font-semibold text-3xl tracking-tight">
										{summary?.availableCredits ?? 0}
									</p>
									<p className="text-muted-foreground text-xs">
										{t("billingPage.reservedFor", {
											count: summary?.reservedCredits ?? 0,
										})}
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="shrink-0"
									onClick={() => setTopUpOpen(true)}
								>
									<Plus className="size-4" />
									{t("billingPage.buyCredits")}
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("billingPage.plan")}</CardTitle>
					</CardHeader>
					<CardContent>
						{loading && !summary ? (
							<Skeleton className="h-9 w-32" />
						) : (
							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-col gap-1">
									<span className="font-semibold text-lg">
										{currentPlanName}
									</span>
									{isActiveSubscriber && summary?.subscription && (
										<p className="text-muted-foreground text-xs">
											{t("billingPage.renewsOn", {
												date: new Date(
													summary.subscription.periodEnd,
												).toLocaleDateString(),
											})}
										</p>
									)}
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<Button size="sm" onClick={() => setUpgradeOpen(true)}>
										<Sparkles className="size-4" />
										{t("billingPage.upgrade")}
									</Button>
									{isActiveSubscriber && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCancelConfirmOpen(true)}
										>
											{t("billingPage.cancelPlan")}
										</Button>
									)}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("billingPage.pricing")}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-1.5">
					{PROCESSING_OPTIONS.map((option) => (
						<div
							key={option.id}
							className="flex items-center justify-between border-border border-b py-2.5 text-sm last:border-0"
						>
							<div>
								<p>{t(`options.${option.id}.label`)}</p>
								<p className="text-muted-foreground text-xs">
									{t(`options.${option.id}.description`)}
								</p>
							</div>
							<span className="shrink-0 text-muted-foreground">
								{catalogLoading && !catalogData ? (
									<Skeleton className="h-4 w-14" />
								) : (
									`${creditsByItem.get(option.id) ?? "—"} ${t("billingPage.creditsSuffix")}`
								)}
							</span>
						</div>
					))}
					<p className="mt-2 flex items-start gap-1.5 text-muted-foreground text-xs">
						<Info className="mt-0.5 size-3.5 shrink-0" />
						{t("billingPage.quoteNote")}
					</p>
				</CardContent>
			</Card>

			<Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t("billingPage.choosePlan")}</DialogTitle>
					</DialogHeader>
					{plansLoading && upgradablePlans.length === 0 ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{Array.from({ length: 2 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
								<Skeleton key={i} className="h-48" />
							))}
						</div>
					) : upgradablePlans.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{t("billingPage.noPlans")}
						</p>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{upgradablePlans.map((plan) => {
								const isCurrentPlan =
									isActiveSubscriber &&
									summary?.subscription?.plan === plan.name;
								return (
									<div
										key={plan.id}
										className="flex flex-col gap-3 rounded-xl border border-border p-4"
									>
										<div>
											<p className="font-medium">{plan.name}</p>
											{plan.description && (
												<p className="text-muted-foreground text-xs">
													{plan.description}
												</p>
											)}
										</div>
										<p className="font-semibold text-2xl tracking-tight">
											{formatPrice(
												plan.priceAmount,
												plan.priceCurrency,
												plan.recurringInterval,
											)}
										</p>
										{plan.benefits.length > 0 && (
											<ul className="flex flex-col gap-1.5">
												{plan.benefits.map((benefit) => (
													<li
														key={benefit}
														className="flex items-start gap-1.5 text-sm"
													>
														<Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
														{benefit}
													</li>
												))}
											</ul>
										)}
										<Button
											className="mt-auto"
											variant={isCurrentPlan ? "outline" : "default"}
											disabled={
												isCurrentPlan ||
												checkingOut ||
												checkingOutProductId === plan.id
											}
											onClick={() => handleCheckout(plan.id)}
										>
											{isCurrentPlan
												? t("billingPage.currentPlan")
												: checkingOutProductId === plan.id
													? t("billingPage.startingCheckout")
													: t("billingPage.select")}
										</Button>
									</div>
								);
							})}
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t("billingPage.buyCredits")}</DialogTitle>
					</DialogHeader>
					{creditPacksLoading && creditPacks.length === 0 ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{Array.from({ length: 2 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered
								<Skeleton key={i} className="h-32" />
							))}
						</div>
					) : creditPacks.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{t("billingPage.noCreditPacks")}
						</p>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{creditPacks.map((pack) => (
								<div
									key={pack.id}
									className="flex flex-col gap-3 rounded-xl border border-border p-4"
								>
									<div>
										<p className="font-medium">{pack.name}</p>
										{pack.description && (
											<p className="text-muted-foreground text-xs">
												{pack.description}
											</p>
										)}
									</div>
									<p className="font-semibold text-2xl tracking-tight">
										{t("billingPage.creditsAmount", { count: pack.credits })}
									</p>
									<p className="text-muted-foreground text-sm">
										{formatPrice(pack.priceAmount, pack.priceCurrency)}
									</p>
									<Button
										className="mt-auto"
										disabled={checkingOut || checkingOutProductId === pack.id}
										onClick={() => handleCheckout(pack.id)}
									>
										{checkingOutProductId === pack.id
											? t("billingPage.startingCheckout")
											: t("billingPage.buy")}
									</Button>
								</div>
							))}
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("billingPage.cancelConfirmTitle")}</DialogTitle>
						<DialogDescription>
							{t("billingPage.cancelConfirmDescription")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCancelConfirmOpen(false)}
						>
							{t("common.cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={handleCancelSubscription}
							disabled={canceling}
						>
							{canceling
								? t("billingPage.canceling")
								: t("billingPage.cancelPlan")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
