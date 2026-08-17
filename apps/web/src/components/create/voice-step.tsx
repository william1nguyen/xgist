import { Volume2 } from "lucide-react";
import { TTS_VOICES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function VoiceStep({
	value,
	onChange,
}: {
	value: string;
	onChange: (voice: string) => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<h3 className="font-medium text-sm">Audio summary voice</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					Choose the voice for the generated summary audio.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{TTS_VOICES.map((voice) => {
					const selected = value === voice.id;
					return (
						<button
							key={voice.id}
							type="button"
							onClick={() => onChange(voice.id)}
							className={cn(
								"flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
								selected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/40",
							)}
						>
							<div
								className={cn(
									"flex size-9 shrink-0 items-center justify-center rounded-full",
									selected
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground",
								)}
							>
								<Volume2 className="size-4" />
							</div>
							<div className="min-w-0">
								<p className="font-medium text-sm">{voice.label}</p>
								<p className="text-muted-foreground text-xs">
									{voice.description}
								</p>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
