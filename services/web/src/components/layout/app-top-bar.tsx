import { AudioLines, Menu, Music, Plus, Search, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { CreditChip } from "@/components/layout/credit-chip";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreateDialogs } from "@/hooks/useCreateDialogs";
import { useDebounce } from "@/hooks/useDebounce";

export function AppTopBar({ onOpenNav }: { onOpenNav: () => void }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { openCreateMedia, openCreateAudio } = useCreateDialogs();
	const location = useLocation();
	const isDashboard = location.pathname === "/";

	const [query, setQuery] = useState(
		() => new URLSearchParams(location.search).get("q") ?? "",
	);
	const debouncedQuery = useDebounce(query, 350);

	// Crossing into or out of the dashboard resyncs the box with whatever
	// ?q= (if any) is already in the URL — but only on that transition,
	// not on every keystroke, so it doesn't fight the effect below while
	// the user is actively typing.
	// biome-ignore lint/correctness/useExhaustiveDependencies: only resync on the dashboard/non-dashboard transition, not on every location.search change (the effect below drives those).
	useEffect(() => {
		setQuery(
			isDashboard ? (new URLSearchParams(location.search).get("q") ?? "") : "",
		);
	}, [isDashboard]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when the debounced query itself changes — location/navigate/isDashboard are read here purely to compare against and dispatch, not to retrigger navigation on their own.
	useEffect(() => {
		const trimmed = debouncedQuery.trim();
		if (!trimmed) {
			// Nothing typed: only ever clear a stale ?q= on the dashboard
			// itself. Never navigate away from wherever the user actually
			// is — the box resets to empty on every non-dashboard page
			// (the effect above), so without this guard, mounting on any
			// other route (e.g. a hard refresh on /audio) would bounce
			// straight back to "/" as soon as this effect's first run saw
			// an empty debounced query here.
			if (isDashboard && location.search) navigate("/", { replace: true });
			return;
		}
		const target = `/?q=${encodeURIComponent(trimmed)}`;
		if (location.pathname + location.search === target) return;
		navigate(target, { replace: isDashboard });
	}, [debouncedQuery]);

	return (
		<header className="flex h-14 shrink-0 items-center gap-3 border-border border-b bg-background px-3">
			<Button
				variant="ghost"
				size="icon"
				onClick={onOpenNav}
				aria-label={t("nav.openMenu")}
			>
				<Menu className="size-5" />
			</Button>
			<div className="flex shrink-0 items-center gap-2">
				<div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<AudioLines className="size-4" />
				</div>
				<span className="hidden truncate font-semibold text-[15px] tracking-tight sm:inline">
					Media Notes
				</span>
			</div>

			<div className="mx-auto flex w-full max-w-lg items-center gap-2">
				<div className="relative flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={t("dashboard.searchPlaceholder")}
						className="h-9 w-full rounded-lg border border-border bg-muted/30 pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm" className="shrink-0">
							<Plus className="size-4" />
							<span className="hidden sm:inline">{t("dashboard.create")}</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={openCreateMedia}>
							<Video className="size-4" />
							{t("dashboard.createMedia")}
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={openCreateAudio}>
							<Music className="size-4" />
							{t("dashboard.createAudio")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				<CreditChip />
				<ThemeToggle />
				<UserMenu collapsed />
			</div>
		</header>
	);
}
