import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { t } = useTranslation();
	const { resolvedTheme, setTheme } = useTheme();

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
			aria-label={t("nav.toggleTheme")}
		>
			<Sun className="hidden size-4 dark:block" />
			<Moon className="size-4 dark:hidden" />
		</Button>
	);
}
