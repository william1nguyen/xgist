import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { VoiceStep } from "@/components/create/voice-step";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	useAudioJobQuery,
	useDraftAudioScriptMutation,
	useGenerateStandaloneAudioMutation,
} from "@/graphql/generated/graphql";
import { DEFAULT_TTS_VOICE } from "@/lib/constants";

type Mode = "paste" | "chat";

export function CreateAudioDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { t } = useTranslation();
	const [mode, setMode] = useState<Mode>("paste");
	const [pasteText, setPasteText] = useState("");
	const [description, setDescription] = useState("");
	const [draftJobId, setDraftJobId] = useState<string | null>(null);
	const [scriptText, setScriptText] = useState("");
	const [voice, setVoice] = useState(DEFAULT_TTS_VOICE);

	const [draftAudioScript, { loading: drafting }] =
		useDraftAudioScriptMutation();
	const [generateStandaloneAudio, { loading: generating }] =
		useGenerateStandaloneAudioMutation();

	const {
		data: draftData,
		startPolling: startDraftPolling,
		stopPolling: stopDraftPolling,
	} = useAudioJobQuery({
		variables: { id: draftJobId ?? "" },
		skip: !draftJobId,
		fetchPolicy: "network-only",
	});
	const draftJob = draftData?.audioJob;
	const draftReady = draftJob?.status === "completed" && !!draftJob.outputText;
	const draftFailed = draftJob?.status === "failed";

	// A plain fixed-interval poll, not ADR 0005's offline/backoff-aware
	// useMediaProgress machinery — this is a single ad hoc job in a
	// dialog, not a batched per-item status feed. Stops once the draft
	// leaves "generating" so it doesn't keep hitting the network after
	// the script (or the failure) has already landed.
	useEffect(() => {
		if (draftJobId && draftJob?.status === "generating") {
			startDraftPolling(2000);
		} else {
			stopDraftPolling();
		}
		return () => stopDraftPolling();
	}, [draftJobId, draftJob?.status, startDraftPolling, stopDraftPolling]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: seed scriptText once when the poll observes the draft finishing, not on every draftJob identity change (the user may go on to edit scriptText themselves).
	useEffect(() => {
		if (draftReady && draftJob?.outputText) {
			setScriptText(draftJob.outputText);
		}
	}, [draftReady]);

	function reset() {
		setMode("paste");
		setPasteText("");
		setDescription("");
		setDraftJobId(null);
		setScriptText("");
		setVoice(DEFAULT_TTS_VOICE);
	}

	async function handleDraft() {
		try {
			const { data } = await draftAudioScript({
				variables: { description },
			});
			if (data?.draftAudioScript.id) {
				setDraftJobId(data.draftAudioScript.id);
			}
		} catch {
			toast.error(t("audio.draftErrorToast"));
		}
	}

	async function handleGenerate(text: string) {
		try {
			await generateStandaloneAudio({
				variables: { text, voice },
				refetchQueries: ["AudioJobs"],
			});
			toast.success(t("audio.generateSuccessToast"));
			onOpenChange(false);
			reset();
		} catch {
			toast.error(t("audio.generateErrorToast"));
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) reset();
			}}
		>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{t("audio.createTitle")}</DialogTitle>
					<DialogDescription>{t("audio.createDescription")}</DialogDescription>
				</DialogHeader>

				<Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
					<TabsList>
						<TabsTrigger value="paste">{t("audio.modePaste")}</TabsTrigger>
						<TabsTrigger value="chat">{t("audio.modeChat")}</TabsTrigger>
					</TabsList>

					<TabsContent value="paste" className="flex flex-col gap-4 pt-4">
						<Textarea
							value={pasteText}
							onChange={(e) => setPasteText(e.target.value)}
							placeholder={t("audio.pastePlaceholder")}
							rows={6}
						/>
						<VoiceStep value={voice} onChange={setVoice} />
						<DialogFooter>
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								{t("common.cancel")}
							</Button>
							<Button
								onClick={() => handleGenerate(pasteText)}
								disabled={!pasteText.trim() || generating}
							>
								{generating ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Sparkles className="size-4" />
								)}
								{t("audio.generate")}
							</Button>
						</DialogFooter>
					</TabsContent>

					<TabsContent value="chat" className="flex flex-col gap-4 pt-4">
						{!draftJobId ? (
							<>
								<Textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder={t("audio.chatPlaceholder")}
									rows={4}
								/>
								<DialogFooter>
									<Button variant="outline" onClick={() => onOpenChange(false)}>
										{t("common.cancel")}
									</Button>
									<Button
										onClick={handleDraft}
										disabled={!description.trim() || drafting}
									>
										{drafting && <Loader2 className="size-4 animate-spin" />}
										{t("audio.draftScript")}
									</Button>
								</DialogFooter>
							</>
						) : draftReady ? (
							<>
								<Textarea
									value={scriptText}
									onChange={(e) => setScriptText(e.target.value)}
									rows={6}
								/>
								<VoiceStep value={voice} onChange={setVoice} />
								<DialogFooter>
									<Button variant="outline" onClick={() => setDraftJobId(null)}>
										{t("audio.startOver")}
									</Button>
									<Button
										onClick={() => handleGenerate(scriptText)}
										disabled={!scriptText.trim() || generating}
									>
										{generating ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<Sparkles className="size-4" />
										)}
										{t("audio.generate")}
									</Button>
								</DialogFooter>
							</>
						) : draftFailed ? (
							<>
								<p className="text-destructive text-sm">
									{t("audio.draftFailed")}
								</p>
								<DialogFooter>
									<Button variant="outline" onClick={() => setDraftJobId(null)}>
										{t("audio.startOver")}
									</Button>
								</DialogFooter>
							</>
						) : (
							<div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
								<Loader2 className="size-4 animate-spin" />
								{t("audio.drafting")}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
