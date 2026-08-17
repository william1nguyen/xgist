import { Coins } from "lucide-react";
import { Link } from "react-router";
import { useBillingSummaryQuery } from "@/graphql/generated/graphql";

export function CreditChip() {
	const { data, loading } = useBillingSummaryQuery({
		fetchPolicy: "cache-and-network",
	});

	return (
		<Link
			to="/billing"
			className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40"
		>
			<Coins className="size-3.5 text-primary" />
			{loading && !data ? (
				<span className="text-muted-foreground">…</span>
			) : (
				<span className="font-medium">
					{data?.billingSummary.availableCredits ?? 0}
				</span>
			)}
		</Link>
	);
}
