import { useTranslation } from "react-i18next";
import { AppearanceTab } from "@/components/settings/appearance-tab";
import { GeneralTab } from "@/components/settings/general-tab";
import { LanguageTab } from "@/components/settings/language-tab";
import { PromptsTab } from "@/components/settings/prompts-tab";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TABS = [
	{ value: "general", labelKey: "settings.tabs.general" },
	{ value: "appearance", labelKey: "settings.tabs.appearance" },
	{ value: "language", labelKey: "settings.tabs.language" },
	{ value: "prompts", labelKey: "settings.tabs.prompts" },
] as const;

const tabTriggerClassName = cn(
	"justify-start rounded-lg px-3 py-2.5 text-left text-sm",
	"data-[state=active]:border-b-0 data-[state=active]:bg-primary/10 data-[state=active]:font-medium data-[state=active]:text-primary",
);

export function SettingsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { t } = useTranslation();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* Fixed height (not max-height) so switching tabs never resizes or
			    jumps the dialog — only the content pane on the right scrolls. */}
			<DialogContent className="flex h-[700px] max-h-[88vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
				<DialogHeader className="border-border border-b px-6 py-4">
					<DialogTitle>{t("settings.title")}</DialogTitle>
				</DialogHeader>

				<Tabs
					defaultValue="general"
					orientation="vertical"
					className="flex min-h-0 flex-1"
				>
					<TabsList className="flex w-56 shrink-0 flex-col items-stretch gap-1 border-border border-r border-b-0 p-3">
						{TABS.map(({ value, labelKey }) => (
							<TabsTrigger
								key={value}
								value={value}
								className={tabTriggerClassName}
							>
								{t(labelKey)}
							</TabsTrigger>
						))}
					</TabsList>
					<div className="min-w-0 flex-1 overflow-y-auto p-8">
						<TabsContent value="general" className="mt-0">
							<GeneralTab />
						</TabsContent>
						<TabsContent value="appearance" className="mt-0">
							<AppearanceTab />
						</TabsContent>
						<TabsContent value="language" className="mt-0">
							<LanguageTab />
						</TabsContent>
						<TabsContent value="prompts" className="mt-0">
							<PromptsTab />
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
