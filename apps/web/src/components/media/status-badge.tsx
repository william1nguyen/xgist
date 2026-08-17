import { Badge } from "@/components/ui/badge";
import type { MediaStatus } from "@/graphql/generated/graphql";

const STYLES: Record<
	MediaStatus,
	{
		label: string;
		variant: "default" | "secondary" | "success" | "destructive" | "warning";
	}
> = {
	PENDING_UPLOAD: { label: "Pending", variant: "secondary" },
	PROCESSING: { label: "Processing", variant: "default" },
	COMPLETED: { label: "Completed", variant: "success" },
	FAILED: { label: "Failed", variant: "destructive" },
	DELETION_PENDING: { label: "Deleting", variant: "warning" },
};

export function StatusBadge({ status }: { status: MediaStatus }) {
	const { label, variant } = STYLES[status];
	return (
		<Badge variant={variant}>
			{status === "PROCESSING" && (
				<span className="size-1.5 animate-pulse rounded-full bg-current" />
			)}
			{label}
		</Badge>
	);
}
