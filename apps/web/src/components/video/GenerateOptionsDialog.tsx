import type { ProcessingOptions } from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { orpc } from "@/utils/orpc";

const OPTION_META: {
	key: keyof Omit<ProcessingOptions, "transcribe" | "generateAudioSummary">;
	label: string;
	cost: number;
}[] = [
	{ key: "summarize", label: "Summarize", cost: 20 },
	{ key: "extractKeywords", label: "Extract Keywords", cost: 5 },
	{ key: "extractMainIdeas", label: "Extract Main Ideas", cost: 10 },
	{ key: "generateNotes", label: "Generate Notes", cost: 15 },
];

type Props = {
	videoId: string;
	existingOptions: ProcessingOptions;
	balance: number;
	onClose: () => void;
};

export default function GenerateOptionsDialog({
	videoId,
	existingOptions,
	balance,
	onClose,
}: Props) {
	const navigate = useNavigate();

	const available = OPTION_META.filter((o) => !existingOptions[o.key]);

	const [selected, setSelected] = useState<
		Set<keyof Omit<ProcessingOptions, "transcribe" | "generateAudioSummary">>
	>(new Set());

	const totalCost = OPTION_META.filter((o) => selected.has(o.key)).reduce(
		(sum, o) => sum + o.cost,
		0,
	);
	const insufficient = totalCost > balance;

	const mutation = useMutation(
		orpc.video.generateOptions.mutationOptions({
			onSuccess: () => {
				navigate("/queue");
			},
		}),
	);

	const toggle = (
		key: keyof Omit<ProcessingOptions, "transcribe" | "generateAudioSummary">,
	) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const handleConfirm = () => {
		const options: ProcessingOptions = {
			transcribe: false,
			summarize: selected.has("summarize"),
			extractKeywords: selected.has("extractKeywords"),
			extractMainIdeas: selected.has("extractMainIdeas"),
			generateNotes: selected.has("generateNotes"),
			generateAudioSummary: false,
		};
		mutation.mutate({ videoId, options });
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
			<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-base">Generate More AI Options</h2>
					<span className="text-muted-foreground text-xs">
						Balance: {balance}c
					</span>
				</div>

				{available.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						All AI options have already been generated.
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{available.map((opt) => {
							const isOn = selected.has(opt.key);
							return (
								<button
									key={opt.key}
									type="button"
									onClick={() => toggle(opt.key)}
									className={[
										"flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors",
										isOn
											? "border-primary bg-primary/10 text-foreground"
											: "border-border bg-background text-muted-foreground hover:border-primary/50",
									].join(" ")}
								>
									<span>{opt.label}</span>
									<span className="text-xs">{opt.cost}c</span>
								</button>
							);
						})}
					</div>
				)}

				{totalCost > 0 && (
					<div
						className={[
							"mt-4 font-medium text-sm",
							insufficient ? "text-red-400" : "text-amber-400",
						].join(" ")}
					>
						Total: {totalCost}c {insufficient && "— insufficient credits"}
					</div>
				)}

				{insufficient && (
					<a
						href="/billing"
						className="mt-1 block text-primary text-xs hover:underline"
					>
						Top up credits →
					</a>
				)}

				<div className="mt-5 flex gap-3">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 rounded-lg border border-border py-2 text-muted-foreground text-sm hover:text-foreground"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={selected.size === 0 || insufficient || mutation.isPending}
						className="flex-1 rounded-lg bg-primary py-2 font-medium text-primary-foreground text-sm transition-opacity disabled:opacity-40"
					>
						{mutation.isPending ? "Starting..." : "Start Processing"}
					</button>
				</div>

				{mutation.isError && (
					<p className="mt-2 text-red-400 text-xs">
						Something went wrong. Please try again.
					</p>
				)}
			</div>
		</div>
	);
}
