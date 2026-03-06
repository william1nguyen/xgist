import {
	ChevronLeft,
	ChevronRight,
	CreditCard,
	ListVideo,
	LogOut,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type NavItem = {
	to: string;
	label: string;
	icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
	{ to: "/upload", label: "Upload", icon: <Upload size={18} /> },
	{ to: "/queue", label: "Queue", icon: <ListVideo size={18} /> },
	{ to: "/billing", label: "Billing", icon: <CreditCard size={18} /> },
];

export default function Sidebar() {
	const [collapsed, setCollapsed] = useState(false);
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();

	const handleSignOut = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate("/login", { replace: true });
					toast.success("Signed out");
				},
			},
		});
	};

	return (
		<aside
			className={`relative flex h-full flex-col border-border border-r bg-card transition-all duration-200 ${
				collapsed ? "w-14" : "w-52"
			}`}
		>
			<div className="flex h-14 items-center justify-between border-border border-b px-3">
				{!collapsed && (
					<span className="truncate font-semibold text-primary">MediaMind</span>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="ml-auto h-7 w-7 shrink-0"
					onClick={() => setCollapsed((c) => !c)}
					aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
				</Button>
			</div>

			<nav className="flex flex-1 flex-col gap-1 p-2">
				{NAV_ITEMS.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
						title={collapsed ? item.label : undefined}
						className={({ isActive }) =>
							`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
								isActive
									? "bg-primary/10 font-medium text-primary"
									: "text-muted-foreground hover:bg-muted hover:text-foreground"
							} ${collapsed ? "justify-center" : ""}`
						}
					>
						{item.icon}
						{!collapsed && <span>{item.label}</span>}
					</NavLink>
				))}
			</nav>

			<div
				className={`border-border border-t p-2 ${collapsed ? "flex justify-center" : ""}`}
			>
				{!collapsed && session?.user?.email && (
					<p className="mb-1 truncate px-2 text-muted-foreground text-xs">
						{session.user.email}
					</p>
				)}
				<Button
					variant="ghost"
					size={collapsed ? "icon" : "sm"}
					className={`text-muted-foreground hover:text-foreground ${collapsed ? "h-8 w-8" : "w-full justify-start gap-2"}`}
					onClick={handleSignOut}
					title={collapsed ? "Sign out" : undefined}
				>
					<LogOut size={16} />
					{!collapsed && "Sign out"}
				</Button>
			</div>
		</aside>
	);
}
