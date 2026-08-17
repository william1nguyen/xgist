import { Coins, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingSummaryQuery } from "@/graphql/generated/graphql";
import { PROCESSING_OPTIONS } from "@/lib/constants";

const SUBSCRIPTION_STATUS_VARIANT = {
	NONE: "secondary",
	ACTIVE: "success",
	CANCELED: "secondary",
	PAST_DUE: "destructive",
} as const;

export default function BillingPage() {
	const { t } = useTranslation();
	const { data, loading } = useBillingSummaryQuery({
		fetchPolicy: "cache-and-network",
	});
	const summary = data?.billingSummary;

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
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("billingPage.subscription")}</CardTitle>
					</CardHeader>
					<CardContent>
						{loading && !summary ? (
							<Skeleton className="h-9 w-32" />
						) : summary?.subscription ? (
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center gap-2">
									<span className="font-medium text-sm">
										{summary.subscription.plan}
									</span>
									<Badge
										variant={
											SUBSCRIPTION_STATUS_VARIANT[summary.subscription.status]
										}
									>
										{summary.subscription.status}
									</Badge>
								</div>
								<p className="text-muted-foreground text-xs">
									{new Date(
										summary.subscription.periodStart,
									).toLocaleDateString()}
									{" – "}
									{new Date(
										summary.subscription.periodEnd,
									).toLocaleDateString()}
								</p>
							</div>
						) : (
							<p className="text-muted-foreground text-sm">
								{t("billingPage.noSubscription")}
							</p>
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
								{option.credits} {t("billingPage.creditsSuffix")}
							</span>
						</div>
					))}
					<p className="mt-2 flex items-start gap-1.5 text-muted-foreground text-xs">
						<Info className="mt-0.5 size-3.5 shrink-0" />
						{t("billingPage.quoteNote")}
					</p>
				</CardContent>
			</Card>

			<Card className="border-dashed">
				<CardContent className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
					<Info className="size-4 shrink-0" />
					{t("billingPage.checkoutNote")}
				</CardContent>
			</Card>
		</div>
	);
}
