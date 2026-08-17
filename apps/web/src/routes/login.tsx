import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
	const { user, loading, login } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	if (!loading && user) return <Navigate to="/" replace />;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await login(email, password);
			navigate("/", { replace: true });
		} catch {
			setError("Invalid email or password.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-lg">Sign in to Media Notes</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								required
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								required
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						{error && <p className="text-destructive text-sm">{error}</p>}
						<Button type="submit" disabled={submitting} className="mt-1">
							{submitting ? "Signing in…" : "Sign in"}
						</Button>
					</form>
					<p className="mt-4 text-center text-muted-foreground text-sm">
						No account?{" "}
						<Link to="/register" className="text-primary hover:underline">
							Register
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
