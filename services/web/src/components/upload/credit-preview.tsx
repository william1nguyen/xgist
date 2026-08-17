import { AlertTriangle, Coins } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	useBillingSummaryQuery,
	useQuoteQuery,
} from "@/graphql/generated/graphql";
import type { ProcessingOptionId } from "@/lib/constants";

export function CreditPreview({ options }: { options: ProcessingOptionId[] }) {
	const { t } = useTranslation();
	const { data: quoteData, loading: quoteLoading } = useQuoteQuery({
		variables: { options },
		skip: options.length === 0,
		fetchPolicy: "network-only",
	});
	const { data: billingData } = useBillingSummaryQuery();

	const totalCredits = quoteData?.quote.totalCredits ?? null;
	const available = billingData?.billingSummary.availableCredits ?? null;
	const insufficient =
		totalCredits != null && available != null && totalCredits > available;

	return (
		<div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
			<div className="flex items-center gap-2 text-muted-foreground">
				<Coins className="size-4" />
				{t("creditPreview.cost")}
			</div>
			<div className="flex items-center gap-2">
				{quoteLoading ? (
					<span className="text-muted-foreground">…</span>
				) : (
					<span className="font-medium">
						{t("creditPreview.credits", { count: totalCredits ?? 0 })}
					</span>
				)}
				{available != null && (
					<span className="text-muted-foreground text-xs">
						{t("creditPreview.available", { count: available })}
					</span>
				)}
				{insufficient && (
					<span className="flex items-center gap-1 text-destructive text-xs">
						<AlertTriangle className="size-3.5" />
						{t("creditPreview.insufficient")}
					</span>
				)}
			</div>
		</div>
	);
}
