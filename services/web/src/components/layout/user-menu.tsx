import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return (first + last).toUpperCase() || "?";
}

export function UserMenu({ collapsed }: { collapsed?: boolean }) {
	const { t } = useTranslation();
	const { user, logout } = useAuth();

	if (!user) return null;

	const avatar = user.imageUrl ? (
		<img
			src={user.imageUrl}
			alt=""
			className="size-8 shrink-0 rounded-full object-cover"
		/>
	) : (
		<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-medium text-primary text-xs">
			{initials(user.name)}
		</div>
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					title={collapsed ? user.name : undefined}
					className={cn(
						"flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-accent",
						collapsed && "justify-center",
					)}
				>
					{avatar}
					{!collapsed && (
						<>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm leading-tight">
									{user.name}
								</p>
								<p className="truncate text-muted-foreground text-xs leading-tight">
									{user.email}
								</p>
							</div>
							<ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
						</>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" side="top" className="w-60">
				<DropdownMenuLabel>
					<div className="flex flex-col gap-0.5">
						<span className="truncate font-medium">{user.name}</span>
						<span className="truncate font-normal text-muted-foreground text-xs">
							{user.email}
						</span>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link to="/settings">
						<Settings className="size-4" />
						{t("nav.settings")}
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => logout()}>
					<LogOut className="size-4" />
					{t("nav.signOut")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
