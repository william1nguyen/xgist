import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { MediaStatus } from "@/graphql/generated/graphql";

const VARIANTS: Record<
	MediaStatus,
	"default" | "secondary" | "success" | "destructive" | "warning"
> = {
	PENDING_UPLOAD: "secondary",
	PROCESSING: "default",
	COMPLETED: "success",
	FAILED: "destructive",
	DELETION_PENDING: "warning",
};

export function StatusBadge({ status }: { status: MediaStatus }) {
	const { t } = useTranslation();
	return (
		<Badge variant={VARIANTS[status]}>
			{status === "PROCESSING" && (
				<span className="size-1.5 animate-pulse rounded-full bg-current" />
			)}
			{t(`status.${status}`)}
		</Badge>
	);
}
