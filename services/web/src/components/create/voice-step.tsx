import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TTS_VOICES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function VoiceStep({
	value,
	onChange,
}: {
	value: string;
	onChange: (voice: string) => void;
}) {
	const { t } = useTranslation();
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playingVoice, setPlayingVoice] = useState<string | null>(null);

	useEffect(() => {
		const audio = new Audio();
		audio.addEventListener("ended", () => setPlayingVoice(null));
		audioRef.current = audio;
		return () => {
			audio.pause();
			audio.src = "";
		};
	}, []);

	function selectAndPreview(voiceId: string) {
		onChange(voiceId);
		const audio = audioRef.current;
		if (!audio) return;
		if (playingVoice === voiceId) {
			audio.pause();
			setPlayingVoice(null);
			return;
		}
		audio.src = `/voice-previews/${voiceId}.mp3`;
		audio.play().catch(() => setPlayingVoice(null));
		setPlayingVoice(voiceId);
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h3 className="font-medium text-sm">{t("voiceStep.title")}</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					{t("voiceStep.description")}
				</p>
			</div>

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{TTS_VOICES.map((voice) => {
					const selected = value === voice.id;
					const isPlaying = playingVoice === voice.id;
					return (
						<button
							key={voice.id}
							type="button"
							onClick={() => selectAndPreview(voice.id)}
							className={cn(
								"flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
								selected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/40",
							)}
						>
							<div
								className={cn(
									"flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
									selected
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground",
									isPlaying && "animate-pulse",
								)}
							>
								<Volume2 className="size-4" />
							</div>
							<div className="min-w-0">
								<p className="font-medium text-sm">{voice.label}</p>
								<p className="text-muted-foreground text-xs">
									{isPlaying
										? t("voiceStep.playingPreview")
										: voice.description}
								</p>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
