import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useBillingSummaryQuery,
	useCreditLedgerHistoryQuery,
} from "@/graphql/generated/graphql";

const DAYS = 30;

function dayKey(iso: string): string {
	return iso.slice(0, 10);
}

export default function UsagePage() {
	const { t } = useTranslation();
	const { data: summaryData, loading: summaryLoading } = useBillingSummaryQuery(
		{ fetchPolicy: "cache-and-network" },
	);
	const { data: ledgerData, loading: ledgerLoading } =
		useCreditLedgerHistoryQuery({
			variables: { pageSize: 200 },
			fetchPolicy: "cache-and-network",
		});

	const summary = summaryData?.billingSummary;
	const entries = ledgerData?.creditLedgerHistory.items ?? [];

	const dailySpend = useMemo(() => {
		const byDay = new Map<string, number>();
		const today = new Date();
		for (let i = DAYS - 1; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			byDay.set(d.toISOString().slice(0, 10), 0);
		}
		for (const entry of entries) {
			const key = dayKey(entry.createdAt);
			if (byDay.has(key)) {
				byDay.set(key, (byDay.get(key) ?? 0) - entry.delta);
			}
		}
		return Array.from(byDay.entries()).map(([date, spent]) => ({
			date: date.slice(5),
			spent,
		}));
	}, [entries]);

	const breakdown = useMemo(() => {
		const counts = new Map<string, number>();
		for (const entry of entries) {
			if (entry.entryType !== "settle" || !entry.itemId) continue;
			counts.set(entry.itemId, (counts.get(entry.itemId) ?? 0) + 1);
		}
		return Array.from(counts.entries())
			.map(([itemId, count]) => ({
				itemId,
				label: t(`options.${itemId}.label`, { defaultValue: itemId }),
				count,
			}))
			.sort((a, b) => b.count - a.count);
	}, [entries, t]);

	const hasData = entries.length > 0;

	return (
		<div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
			<PageHeader
				title={t("usage.title")}
				description={t("usage.description")}
			/>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>{t("usage.availableCredits")}</CardTitle>
					</CardHeader>
					<CardContent>
						{summaryLoading && !summary ? (
							<Skeleton className="h-9 w-24" />
						) : (
							<p className="font-semibold text-3xl tracking-tight">
								{summary?.availableCredits ?? 0}
							</p>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>{t("usage.reservedCredits")}</CardTitle>
					</CardHeader>
					<CardContent>
						{summaryLoading && !summary ? (
							<Skeleton className="h-9 w-24" />
						) : (
							<p className="font-semibold text-3xl tracking-tight">
								{summary?.reservedCredits ?? 0}
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("usage.dailySpendTitle")}</CardTitle>
				</CardHeader>
				<CardContent>
					{ledgerLoading && !ledgerData ? (
						<Skeleton className="h-64 w-full" />
					) : !hasData ? (
						<p className="py-8 text-center text-muted-foreground text-sm">
							{t("usage.noData")}
						</p>
					) : (
						<div className="h-64 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={dailySpend}>
									<CartesianGrid
										strokeDasharray="3 3"
										className="stroke-border"
									/>
									<XAxis
										dataKey="date"
										tick={{ fontSize: 11 }}
										interval={4}
										stroke="currentColor"
										className="text-muted-foreground"
									/>
									<YAxis
										tick={{ fontSize: 11 }}
										stroke="currentColor"
										className="text-muted-foreground"
										label={{
											value: t("usage.creditsAxisLabel"),
											angle: -90,
											position: "insideLeft",
											style: { fontSize: 11 },
										}}
									/>
									<Tooltip
										contentStyle={{
											fontSize: 12,
											borderRadius: 8,
											borderColor: "var(--border)",
											backgroundColor: "var(--popover)",
											color: "var(--popover-foreground)",
										}}
									/>
									<Bar
										dataKey="spent"
										fill="var(--primary)"
										radius={[3, 3, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("usage.breakdownTitle")}</CardTitle>
				</CardHeader>
				<CardContent>
					{ledgerLoading && !ledgerData ? (
						<Skeleton className="h-48 w-full" />
					) : breakdown.length === 0 ? (
						<p className="py-8 text-center text-muted-foreground text-sm">
							{t("usage.noData")}
						</p>
					) : (
						<div className="h-48 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={breakdown} layout="vertical">
									<CartesianGrid
										strokeDasharray="3 3"
										className="stroke-border"
									/>
									<XAxis
										type="number"
										tick={{ fontSize: 11 }}
										allowDecimals={false}
										stroke="currentColor"
										className="text-muted-foreground"
										label={{
											value: t("usage.countAxisLabel"),
											position: "insideBottom",
											offset: -5,
											style: { fontSize: 11 },
										}}
									/>
									<YAxis
										type="category"
										dataKey="label"
										tick={{ fontSize: 11 }}
										width={110}
										stroke="currentColor"
										className="text-muted-foreground"
									/>
									<Tooltip
										contentStyle={{
											fontSize: 12,
											borderRadius: 8,
											borderColor: "var(--border)",
											backgroundColor: "var(--popover)",
											color: "var(--popover-foreground)",
										}}
									/>
									<Bar
										dataKey="count"
										fill="var(--primary)"
										radius={[0, 3, 3, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
