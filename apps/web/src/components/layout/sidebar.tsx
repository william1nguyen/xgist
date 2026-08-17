import {
	AudioLines,
	CreditCard,
	LayoutGrid,
	Menu,
	Sparkles,
	X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { CreditChip } from "@/components/layout/credit-chip";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
	{ to: "/create", label: "Create", icon: Sparkles, end: false },
	{ to: "/billing", label: "Billing", icon: CreditCard, end: false },
];

function Logo() {
	return (
		<div className="flex items-center gap-2.5 px-2">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
				<AudioLines className="size-4.5" />
			</div>
			<span className="font-semibold text-[15px] tracking-tight">
				Media Notes
			</span>
		</div>
	);
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
	return (
		<nav className="flex flex-col gap-0.5">
			{NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
				<NavLink
					key={to}
					to={to}
					end={end}
					onClick={onNavigate}
					className={({ isActive }) =>
						cn(
							"group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
							isActive
								? "bg-primary/10 font-medium text-primary"
								: "text-muted-foreground hover:bg-accent hover:text-foreground",
						)
					}
				>
					<Icon className="size-4 shrink-0" />
					{label}
				</NavLink>
			))}
		</nav>
	);
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
	return (
		<div className="flex h-full flex-col gap-6 p-4">
			<Logo />
			<Nav onNavigate={onNavigate} />
			<div className="mt-auto flex flex-col gap-3">
				<div className="flex items-center justify-between gap-2 border-border border-t pt-3">
					<CreditChip />
					<ThemeToggle />
				</div>
				<UserMenu />
			</div>
		</div>
	);
}

export function Sidebar() {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<>
			<aside className="hidden w-64 shrink-0 border-border border-r bg-muted/20 md:flex">
				<SidebarBody />
			</aside>

			<div className="flex h-12 shrink-0 items-center justify-between border-border border-b px-3 md:hidden">
				<Logo />
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setMobileOpen(true)}
					aria-label="Open menu"
				>
					<Menu className="size-5" />
				</Button>
			</div>

			{mobileOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					<button
						type="button"
						aria-label="Close menu"
						className="absolute inset-0 bg-black/50"
						onClick={() => setMobileOpen(false)}
					/>
					<div className="slide-in-from-left absolute inset-y-0 left-0 w-72 animate-in bg-background shadow-xl duration-200">
						<div className="flex justify-end p-2">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setMobileOpen(false)}
								aria-label="Close menu"
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
