import { CreditCard, LayoutGrid, Upload } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
	{ to: "/upload", label: "Upload", icon: Upload, end: false },
	{ to: "/billing", label: "Billing", icon: CreditCard, end: false },
];

export function Sidebar() {
	return (
		<aside className="hidden w-56 shrink-0 flex-col border-border border-r bg-card/40 p-4 md:flex">
			<div className="mb-6 px-2 font-semibold text-lg tracking-tight">
				Media Notes
			</div>
			<nav className="flex flex-col gap-1">
				{NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
					<NavLink
						key={to}
						to={to}
						end={end}
						className={({ isActive }) =>
							cn(
								"flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
								isActive
									? "bg-primary/10 font-medium text-primary"
									: "text-muted-foreground hover:bg-accent hover:text-foreground",
							)
						}
					>
						<Icon className="size-4" />
						{label}
					</NavLink>
				))}
			</nav>
		</aside>
	);
}
