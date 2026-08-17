import { CreditChip } from "@/components/layout/credit-chip";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export function Topbar() {
	return (
		<header className="flex h-14 shrink-0 items-center justify-end gap-3 border-border border-b px-4 md:px-6">
			<CreditChip />
			<ThemeToggle />
			<UserMenu />
		</header>
	);
}
