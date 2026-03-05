type AudioSummaryPlayerProps = {
	src: string;
};

export default function AudioSummaryPlayer({ src }: AudioSummaryPlayerProps) {
	return (
		<div className="rounded-xl border border-border bg-card p-3">
			<p className="mb-2 font-medium text-muted-foreground text-xs">
				Audio Summary
			</p>
			<audio src={src} controls className="h-8 w-full" />
		</div>
	);
}
