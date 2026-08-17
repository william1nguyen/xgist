import { Coins, Info } from "lucide-react";
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
	const { data, loading } = useBillingSummaryQuery({
		fetchPolicy: "cache-and-network",
	});
	const summary = data?.billingSummary;

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
			<h1 className="font-semibold text-xl">Billing</h1>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<Coins className="size-4 text-primary" />
							Credits
						</CardTitle>
					</CardHeader>
					<CardContent>
						{loading && !summary ? (
							<Skeleton className="h-8 w-24" />
						) : (
							<div className="flex flex-col gap-1">
								<p className="font-semibold text-2xl">
									{summary?.availableCredits ?? 0}
								</p>
								<p className="text-muted-foreground text-xs">
									{summary?.reservedCredits ?? 0} reserved for in-progress jobs
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Subscription</CardTitle>
					</CardHeader>
					<CardContent>
						{loading && !summary ? (
							<Skeleton className="h-8 w-32" />
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
								No active subscription.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Pricing</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-1.5">
					{PROCESSING_OPTIONS.map((option) => (
						<div
							key={option.id}
							className="flex items-center justify-between border-border border-b py-2 text-sm last:border-0"
						>
							<span>{option.label}</span>
							<span className="text-muted-foreground">
								{option.credits} credits
							</span>
						</div>
					))}
					<p className="mt-2 flex items-start gap-1.5 text-muted-foreground text-xs">
						<Info className="mt-0.5 size-3.5 shrink-0" />
						The exact cost of a selection is always confirmed by a live quote
						before you start processing.
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
					<Info className="size-4 shrink-0" />
					Subscription checkout isn't available yet — purchasing credits and
					managing plans is still being built on the billing service.
				</CardContent>
			</Card>
		</div>
	);
}
