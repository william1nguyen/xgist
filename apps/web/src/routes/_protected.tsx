import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import Sidebar from "@/components/sidebar";
import { authClient } from "@/lib/auth-client";

export default function ProtectedLayout() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isPending && !session) {
			navigate("/login", { replace: true });
		}
	}, [session, isPending, navigate]);

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!session) return null;

	return (
		<div className="flex h-full overflow-hidden">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<Outlet />
			</main>
		</div>
	);
}
