import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const THEMES = [
	{ id: "light", icon: Sun, labelKey: "settings.appearance.light" },
	{ id: "dark", icon: Moon, labelKey: "settings.appearance.dark" },
	{ id: "system", icon: Monitor, labelKey: "settings.appearance.system" },
] as const;

export function AppearanceTab() {
	const { t } = useTranslation();
	const { theme, setTheme } = useTheme();
	// next-themes' `theme` is undefined until mounted client-side; avoid a
	// hydration/selection mismatch by rendering the picker only once known.
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.tabs.appearance")}</CardTitle>
				<CardDescription>
					{t("settings.appearance.description")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{THEMES.map(({ id, icon: Icon, labelKey }) => {
						const selected = mounted && theme === id;
						return (
							<button
								key={id}
								type="button"
								onClick={() => setTheme(id)}
								className={cn(
									"flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
									selected
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/40",
								)}
							>
								<div
									className={cn(
										"flex size-9 items-center justify-center rounded-full",
										selected
											? "bg-primary text-primary-foreground"
											: "bg-muted text-muted-foreground",
									)}
								>
									{selected ? (
										<Check className="size-4" />
									) : (
										<Icon className="size-4" />
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
