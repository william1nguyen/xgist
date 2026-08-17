import { Navigate, Outlet } from "react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedLayout() {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!user) return <Navigate to="/login" replace />;

	return (
		<div className="flex min-h-screen">
			<Sidebar />
			<div className="flex min-w-0 flex-1 flex-col">
				<Topbar />
				<main className="min-w-0 flex-1 overflow-y-auto">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
