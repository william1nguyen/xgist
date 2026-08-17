import { useTranslation } from "react-i18next";
import { AppearanceTab } from "@/components/settings/appearance-tab";
import { GeneralTab } from "@/components/settings/general-tab";
import { LanguageTab } from "@/components/settings/language-tab";
import { PromptsTab } from "@/components/settings/prompts-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
	const { t } = useTranslation();

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("settings.title")}
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					{t("settings.description")}
				</p>
			</div>

			<Tabs defaultValue="general">
				<TabsList>
					<TabsTrigger value="general">
						{t("settings.tabs.general")}
					</TabsTrigger>
					<TabsTrigger value="appearance">
						{t("settings.tabs.appearance")}
					</TabsTrigger>
					<TabsTrigger value="language">
						{t("settings.tabs.language")}
					</TabsTrigger>
					<TabsTrigger value="prompts">
						{t("settings.tabs.prompts")}
					</TabsTrigger>
				</TabsList>
				<TabsContent value="general" className="mt-6">
					<GeneralTab />
				</TabsContent>
				<TabsContent value="appearance" className="mt-6">
					<AppearanceTab />
				</TabsContent>
				<TabsContent value="language" className="mt-6">
					<LanguageTab />
				</TabsContent>
				<TabsContent value="prompts" className="mt-6">
					<PromptsTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
