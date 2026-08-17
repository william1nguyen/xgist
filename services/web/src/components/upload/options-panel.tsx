import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PROCESSING_OPTIONS, type ProcessingOptionId } from "@/lib/constants";

type OptionsPanelProps = {
	selected: Set<ProcessingOptionId>;
	onChange: (next: Set<ProcessingOptionId>) => void;
	// Options the media already has generated, from a prior request — a
	// dependsOn option they unlock even when this dialog session didn't
	// (re)select the option it depends on. Defaults to empty for the
	// create flow, where nothing exists yet.
	existingOptions?: Set<ProcessingOptionId>;
};

export function OptionsPanel({
	selected,
	onChange,
	existingOptions,
}: OptionsPanelProps) {
	const { t } = useTranslation();
	const summarizeSelected =
		selected.has("summarize") || (existingOptions?.has("summarize") ?? false);

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
				// A "required" option (transcribe) is only non-negotiable when
				// it doesn't exist yet — the create flow, where existingOptions
				// is never passed. Once it already exists (a regenerate
				// request), it behaves like any other already-generated
				// option: available to reselect, not forced.
				const alreadyExists = existingOptions?.has(option.id) ?? false;
				const disabled =
					(option.required && !alreadyExists) ||
					(option.dependsOn != null && !summarizeSelected);
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
								{t(`options.${option.id}.label`)}
								{option.required && !alreadyExists && (
									<span className="ml-1.5 text-muted-foreground text-xs">
										{t("options.required")}
									</span>
								)}
							</Label>
							<p className="text-muted-foreground text-xs">
								{t(`options.${option.id}.description`)}
								{option.dependsOn &&
									!summarizeSelected &&
									` ${t("options.requiresDependency", { label: t(`options.${option.dependsOn}.label`) })}`}
							</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}
