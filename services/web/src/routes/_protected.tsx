import { useState } from "react";
import { Navigate, Outlet } from "react-router";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { NavDrawer } from "@/components/layout/nav-drawer";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedLayout() {
	const { user, loading } = useAuth();
	const [navOpen, setNavOpen] = useState(false);

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!user) return <Navigate to="/login" replace />;

	return (
		<div className="flex h-screen flex-col">
			<AppTopBar onOpenNav={() => setNavOpen(true)} />
			<main className="min-w-0 flex-1 overflow-y-auto">
				<Outlet />
			</main>
			<NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />
		</div>
	);
}
