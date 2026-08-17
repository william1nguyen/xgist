import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { NavDrawer } from "@/components/layout/nav-drawer";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedLayout() {
	const { user, loading } = useAuth();
	const [navOpen, setNavOpen] = useState(false);
	const location = useLocation();

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!user) {
		// Carry the page the user was actually on through login, so
		// signing back in (or a transient session hiccup that bounces
		// through here) lands back where they were instead of always at
		// the dashboard.
		const redirect = encodeURIComponent(location.pathname + location.search);
		return <Navigate to={`/login?redirect=${redirect}`} replace />;
	}

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
