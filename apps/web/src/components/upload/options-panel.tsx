import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PROCESSING_OPTIONS, type ProcessingOptionId } from "@/lib/constants";

type OptionsPanelProps = {
	selected: Set<ProcessingOptionId>;
	onChange: (next: Set<ProcessingOptionId>) => void;
};

export function OptionsPanel({ selected, onChange }: OptionsPanelProps) {
	const summarizeSelected = selected.has("summarize");

	function toggle(id: ProcessingOptionId) {
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
			// generate_audio_summary depends on summarize (billing.md).
			if (id === "summarize") next.delete("generate_audio_summary");
		} else {
			next.add(id);
		}
		onChange(next);
	}

	return (
		<div className="flex flex-col gap-3">
			{PROCESSING_OPTIONS.map((option) => {
				const disabled =
					option.required || (option.dependsOn != null && !summarizeSelected);
				return (
					<div key={option.id} className="flex items-start gap-3">
						<Checkbox
							id={option.id}
							checked={selected.has(option.id)}
							disabled={disabled}
							onCheckedChange={() => toggle(option.id)}
							className="mt-0.5"
						/>
						<div className="min-w-0 flex-1">
							<Label
								htmlFor={option.id}
								className={disabled ? "text-muted-foreground" : ""}
							>
								{option.label}
								{option.required && (
									<span className="ml-1.5 text-muted-foreground text-xs">
										(required)
									</span>
								)}
							</Label>
							<p className="text-muted-foreground text-xs">
								{option.description}
								{option.dependsOn &&
									!summarizeSelected &&
									" — requires Summary"}
							</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}
