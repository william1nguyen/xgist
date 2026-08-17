import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
	type PromptSettingsQuery,
	usePromptSettingsQuery,
	useUpdatePromptSettingMutation,
} from "@/graphql/generated/graphql";

const PROMPT_SECTIONS = [
	"summarize",
	"extract_keywords",
	"extract_keypoints",
	"generate_notes",
] as const;

const MAX_PROMPT_LENGTH = 500;

type PromptSetting = PromptSettingsQuery["promptSettings"][number];

function SectionEditor({
	section,
	saved,
}: {
	section: (typeof PROMPT_SECTIONS)[number];
	saved: PromptSetting | undefined;
}) {
	const { t } = useTranslation();
	const [value, setValue] = useState(saved?.promptText ?? "");
	const [updatePromptSetting, { loading }] = useUpdatePromptSettingMutation();
	const [justSaved, setJustSaved] = useState(false);

	useEffect(() => {
		setValue(saved?.promptText ?? "");
	}, [saved?.promptText]);

	const dirty = value !== (saved?.promptText ?? "");

	async function handleSave() {
		try {
			await updatePromptSetting({
				variables: { section, promptText: value },
				optimisticResponse: {
					updatePromptSetting: {
						__typename: "PromptSetting",
						section,
						promptText: value,
						updatedAt: new Date().toISOString(),
					},
				},
			});
			setJustSaved(true);
			setTimeout(() => setJustSaved(false), 1500);
		} catch {
			toast.error(t("settings.prompts.errorToast"));
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<p className="font-medium text-sm">{t(`options.${section}.label`)}</p>
				<span className="text-muted-foreground text-xs">
					{t("settings.prompts.charCount", { count: value.length })}
				</span>
			</div>
			<Textarea
				value={value}
				onChange={(e) => setValue(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
				placeholder={t("settings.prompts.placeholder")}
				rows={3}
				maxLength={MAX_PROMPT_LENGTH}
			/>
			<div className="flex justify-end">
				<button
					type="button"
					onClick={handleSave}
					disabled={loading || !dirty}
					className="rounded-md px-3 py-1.5 text-primary text-sm transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground hover:enabled:bg-primary/10"
				>
					{justSaved
						? t("settings.prompts.saved")
						: loading
							? t("common.saving")
							: t("settings.prompts.save")}
				</button>
			</div>
		</div>
	);
}

export function PromptsTab() {
	const { t } = useTranslation();
	const { data } = usePromptSettingsQuery();
	const bySection = new Map(
		(data?.promptSettings ?? []).map((s) => [s.section, s]),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.tabs.prompts")}</CardTitle>
				<CardDescription>{t("settings.prompts.description")}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				{PROMPT_SECTIONS.map((section) => (
					<SectionEditor
						key={section}
						section={section}
						saved={bySection.get(section)}
					/>
				))}
			</CardContent>
		</Card>
	);
}
