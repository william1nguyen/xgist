import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function Register() {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: { name: "", email: "", password: "" },
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Min 2 characters"),
				email: z.email("Invalid email"),
				password: z.string().min(8, "Min 8 characters"),
			}),
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{ name: value.name, email: value.email, password: value.password },
				{
					onSuccess: () => navigate("/upload"),
					onError: (ctx) => toast.error(ctx.error.message ?? "Sign up failed"),
				},
			);
		},
	});

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
				<h1 className="mb-6 text-center font-semibold text-2xl">
					Create your account
				</h1>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-1">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors[0] && (
									<p className="text-destructive text-sm">
										{field.state.meta.errors[0].message}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field name="email">
						{(field) => (
							<div className="space-y-1">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors[0] && (
									<p className="text-destructive text-sm">
										{field.state.meta.errors[0].message}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field name="password">
						{(field) => (
							<div className="space-y-1">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors[0] && (
									<p className="text-destructive text-sm">
										{field.state.meta.errors[0].message}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Subscribe>
						{(state) => (
							<Button
								type="submit"
								className="w-full"
								disabled={state.isSubmitting}
							>
								{state.isSubmitting ? "Creating account..." : "Sign Up"}
							</Button>
						)}
					</form.Subscribe>
				</form>

				<p className="mt-4 text-center text-muted-foreground text-sm">
					Already have an account?{" "}
					<Link
						to="/login"
						className="text-primary underline-offset-4 hover:underline"
					>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
