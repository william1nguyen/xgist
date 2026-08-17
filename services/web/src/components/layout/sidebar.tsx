import {
	AudioLines,
	BarChart3,
	ChevronsLeft,
	ChevronsRight,
	CreditCard,
	LayoutGrid,
	Menu,
	Sparkles,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { CreditChip } from "@/components/layout/credit-chip";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ to: "/", labelKey: "nav.dashboard", icon: LayoutGrid, end: true },
	{ to: "/create", labelKey: "nav.create", icon: Sparkles, end: false },
	{ to: "/billing", labelKey: "nav.billing", icon: CreditCard, end: false },
	{ to: "/usage", labelKey: "nav.usage", icon: BarChart3, end: false },
] as const;

const COLLAPSE_STORAGE_KEY = "mn_sidebar_collapsed";

function Logo({ collapsed }: { collapsed?: boolean }) {
	return (
		<div
			className={cn(
				"flex items-center gap-2.5",
				collapsed ? "justify-center px-0" : "px-2",
			)}
		>
			<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
				<AudioLines className="size-4.5" />
			</div>
			{!collapsed && (
				<span className="truncate font-semibold text-[15px] tracking-tight">
					Media Notes
				</span>
			)}
		</div>
	);
}

function Nav({
	collapsed,
	onNavigate,
}: {
	collapsed?: boolean;
	onNavigate?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<nav className="flex w-full flex-col gap-0.5">
			{NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => {
				const label = t(labelKey);
				return (
					<NavLink
						key={to}
						to={to}
						end={end}
						onClick={onNavigate}
						title={collapsed ? label : undefined}
						className={({ isActive }) =>
							cn(
								"group flex items-center gap-2.5 rounded-lg py-2 text-sm transition-colors",
								collapsed ? "justify-center px-0" : "px-2.5",
								isActive
									? "bg-primary/10 font-medium text-primary"
									: "text-muted-foreground hover:bg-accent hover:text-foreground",
							)
						}
					>
						<Icon className="size-4 shrink-0" />
						{!collapsed && label}
					</NavLink>
				);
			})}
		</nav>
	);
}

function SidebarBody({
	collapsed,
	onNavigate,
}: {
	collapsed?: boolean;
	onNavigate?: () => void;
}) {
	return (
		<div className="flex h-full w-full min-w-0 flex-col gap-6 p-4">
			<Logo collapsed={collapsed} />
			<Nav collapsed={collapsed} onNavigate={onNavigate} />
			<div className="mt-auto flex w-full flex-col gap-3">
				<div
					className={cn(
						"flex items-center gap-2 border-border border-t pt-3",
						collapsed ? "flex-col" : "justify-between",
					)}
				>
					<CreditChip collapsed={collapsed} />
					<ThemeToggle />
				</div>
				<UserMenu collapsed={collapsed} />
			</div>
		</div>
	);
}

export function Sidebar() {
	const { t } = useTranslation();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
	}, []);

	function toggleCollapsed() {
		setCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
			return next;
		});
	}

	return (
		<>
			<aside
				className={cn(
					"relative hidden shrink-0 flex-col border-border border-r bg-muted/20 transition-[width] duration-150 md:flex",
					collapsed ? "w-[68px]" : "w-64",
				)}
			>
				<SidebarBody collapsed={collapsed} />
				<button
					type="button"
					onClick={toggleCollapsed}
					title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
					className="-right-3 absolute top-6 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
				>
					{collapsed ? (
						<ChevronsRight className="size-3.5" />
					) : (
						<ChevronsLeft className="size-3.5" />
					)}
				</button>
			</aside>

			<div className="flex h-12 shrink-0 items-center justify-between border-border border-b px-3 md:hidden">
				<Logo />
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setMobileOpen(true)}
					aria-label={t("nav.openMenu")}
				>
					<Menu className="size-5" />
				</Button>
			</div>

			{mobileOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					<button
						type="button"
						aria-label={t("nav.closeMenu")}
						className="absolute inset-0 bg-black/50"
						onClick={() => setMobileOpen(false)}
					/>
					<div className="slide-in-from-left absolute inset-y-0 left-0 w-72 animate-in bg-background shadow-xl duration-200">
						<div className="flex justify-end p-2">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setMobileOpen(false)}
								aria-label={t("nav.closeMenu")}
							>
								<X className="size-5" />
							</Button>
						</div>
						<SidebarBody onNavigate={() => setMobileOpen(false)} />
					</div>
				</div>
			)}
		</>
	);
}
