import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LANGUAGES = [
	{ code: "en", labelKey: "settings.language.en" },
	{ code: "vi", labelKey: "settings.language.vi" },
] as const;

export function LanguageTab() {
	const { t, i18n } = useTranslation();
	const current = i18n.resolvedLanguage ?? i18n.language;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.tabs.language")}</CardTitle>
				<CardDescription>{t("settings.language.description")}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{LANGUAGES.map(({ code, labelKey }) => {
						const selected = current === code;
						return (
							<button
								key={code}
								type="button"
								onClick={() => i18n.changeLanguage(code)}
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
									{selected ? (
										<Check className="size-4" />
									) : (
										<Languages className="size-4" />
									)}
								</div>
								<span className="font-medium text-sm">{t(labelKey)}</span>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
