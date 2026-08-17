import { Coins } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useBillingSummaryQuery } from "@/graphql/generated/graphql";
import { cn } from "@/lib/utils";

export function CreditChip({ collapsed }: { collapsed?: boolean }) {
	const { t } = useTranslation();
	const { data, loading } = useBillingSummaryQuery({
		fetchPolicy: "cache-and-network",
	});

	return (
		<Link
			to="/billing"
			title={collapsed ? t("nav.billing") : undefined}
			className={cn(
				"flex items-center gap-1.5 rounded-full border border-border bg-card text-sm transition-colors hover:border-primary/40",
				collapsed ? "justify-center p-1.5" : "px-3 py-1.5",
			)}
		>
			<Coins className="size-3.5 text-primary" />
			{!collapsed &&
				(loading && !data ? (
					<span className="text-muted-foreground">…</span>
				) : (
					<span className="font-medium">
						{data?.billingSummary.availableCredits ?? 0}
					</span>
				))}
		</Link>
	);
}
