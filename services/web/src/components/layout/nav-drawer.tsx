import {
	AudioLines,
	BarChart3,
	CreditCard,
	LayoutGrid,
	Music,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { Button } from "@/components/ui/button";
import { useCreateDialogs } from "@/hooks/useCreateDialogs";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ to: "/", labelKey: "nav.dashboard", icon: LayoutGrid, end: true },
	{ to: "/audio", labelKey: "nav.audio", icon: Music, end: false },
	{ to: "/billing", labelKey: "nav.billing", icon: CreditCard, end: false },
	{ to: "/usage", labelKey: "nav.usage", icon: BarChart3, end: false },
	{ to: "/trash", labelKey: "nav.trash", icon: Trash2, end: false },
] as const;

const navItemClasses =
	"flex items-center gap-3 rounded-lg px-3 py-3 text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

// NavDrawer is a YouTube-style overlay: closed, it reserves no layout
// space at all (AppTopBar's hamburger is the only persistent nav
// affordance). Open, it floats above the page on a dimmed backdrop
// rather than pushing content — the same treatment at every breakpoint,
// so there's no separate desktop-rail / mobile-drawer split to maintain.
export function NavDrawer({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const { openCreateMedia } = useCreateDialogs();

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50">
			<button
				type="button"
				aria-label={t("nav.closeMenu")}
				className="absolute inset-0 bg-black/50"
				onClick={onClose}
			/>
			<div className="slide-in-from-left absolute inset-y-0 left-0 flex w-80 animate-in flex-col gap-8 bg-background p-5 shadow-xl duration-200">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3 px-1">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<AudioLines className="size-5.5" />
						</div>
						<span className="truncate font-semibold text-xl tracking-tight">
							Media Notes
						</span>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label={t("nav.closeMenu")}
					>
						<X className="size-5" />
					</Button>
				</div>

				<nav className="flex w-full flex-col gap-1.5">
					<button
						type="button"
						onClick={() => {
							openCreateMedia();
							onClose();
						}}
						className={navItemClasses}
					>
						<Sparkles className="size-5 shrink-0" />
						{t("nav.create")}
					</button>
					{NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
						<NavLink
							key={to}
							to={to}
							end={end}
							onClick={onClose}
							className={({ isActive }) =>
								cn(
									"flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors",
									isActive
										? "bg-primary/10 font-medium text-primary"
										: "text-muted-foreground hover:bg-accent hover:text-foreground",
								)
							}
						>
							<Icon className="size-5 shrink-0" />
							{t(labelKey)}
						</NavLink>
					))}
				</nav>
			</div>
		</div>
	);
}
