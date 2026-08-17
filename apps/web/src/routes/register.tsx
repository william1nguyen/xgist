import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
	const { user, loading, register } = useAuth();
	const navigate = useNavigate();
	const [name, setName] = useState("");
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
			await register(email, password, name);
			navigate("/", { replace: true });
		} catch {
			setError(
				"Couldn't create that account — the email may already be registered.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-lg">Create your account</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								required
								autoComplete="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
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
								minLength={8}
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						{error && <p className="text-destructive text-sm">{error}</p>}
						<Button type="submit" disabled={submitting} className="mt-1">
							{submitting ? "Creating account…" : "Create account"}
						</Button>
					</form>
					<p className="mt-4 text-center text-muted-foreground text-sm">
						Already have an account?{" "}
						<Link to="/login" className="text-primary hover:underline">
							Sign in
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
