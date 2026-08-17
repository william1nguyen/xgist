import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

// Only ever redirect back into this app's own SPA routes. A bare "/foo"
// is safe; "//evil.com" or "https://evil.com" parse as protocol-relative/
// absolute URLs a browser would actually navigate to, so anything not
// starting with exactly one "/" is rejected in favor of the default.
function safeRedirectTarget(raw: string | null): string {
	if (raw?.startsWith("/") && !raw.startsWith("//")) return raw;
	return "/";
}

export default function LoginPage() {
	const { t } = useTranslation();
	const { user, loading, login } = useAuth();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const redirectTo = safeRedirectTarget(searchParams.get("redirect"));
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	if (!loading && user) return <Navigate to={redirectTo} replace />;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await login(email, password);
			navigate(redirectTo, { replace: true });
		} catch {
			setError(t("auth.invalidCredentials"));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-lg">{t("auth.loginTitle")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="email">{t("auth.emailLabel")}</Label>
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
							<Label htmlFor="password">{t("auth.passwordLabel")}</Label>
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
							{submitting ? t("auth.signingIn") : t("auth.signIn")}
						</Button>
					</form>
					<p className="mt-4 text-center text-muted-foreground text-sm">
						{t("auth.noAccount")}{" "}
						<Link to="/register" className="text-primary hover:underline">
							{t("auth.register")}
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
