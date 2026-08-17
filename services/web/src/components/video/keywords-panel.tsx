import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { ContentDetailQuery } from "@/graphql/generated/graphql";

type Keyword = ContentDetailQuery["contentDetail"]["keywords"][number];

export function KeywordsPanel({ keywords }: { keywords: Keyword[] }) {
	const { t } = useTranslation();
	if (keywords.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">{t("video.noKeywords")}</p>
		);
	}

	const sorted = [...keywords].sort((a, b) => a.position - b.position);

	return (
		<div className="flex flex-wrap gap-2">
			{sorted.map((kw) => (
				<Badge key={kw.keyword} variant="outline">
					{kw.keyword}
					<span className="text-muted-foreground">
						{Math.round(kw.score * 100)}
					</span>
				</Badge>
			))}
		</div>
	);
}
