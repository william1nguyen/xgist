import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRequestAccountDeletionMutation } from "@/graphql/generated/graphql";
import { useAuth } from "@/hooks/useAuth";

function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return (first + last).toUpperCase() || "?";
}

export default function SettingsPage() {
	const { user, logout } = useAuth();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [requestDeletion, { loading: deleting }] =
		useRequestAccountDeletionMutation();

	if (!user) return null;

	async function handleDelete() {
		try {
			await requestDeletion();
			toast.success("Account deletion requested.");
			setConfirmOpen(false);
			await logout();
		} catch {
			toast.error("Couldn't request account deletion. Try again.");
		}
	}

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage your account and profile.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>
						Your account information from identity.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<div className="flex items-center gap-4">
						{user.imageUrl ? (
							<img
								src={user.imageUrl}
								alt=""
								className="size-16 shrink-0 rounded-full object-cover"
							/>
						) : (
							<div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/15 font-medium text-lg text-primary">
								{initials(user.name)}
							</div>
						)}
						<div className="min-w-0">
							<p className="truncate font-medium">{user.name}</p>
							<p className="truncate text-muted-foreground text-sm">
								{user.email}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 border-border border-t pt-5 sm:grid-cols-2">
						<div>
							<p className="text-muted-foreground text-xs">Email status</p>
							<div className="mt-1 flex items-center gap-1.5 text-sm">
								{user.emailVerified ? (
									<>
										<CheckCircle2 className="size-3.5 text-emerald-500" />
										Verified
									</>
								) : (
									<>
										<AlertTriangle className="size-3.5 text-amber-500" />
										Not verified
									</>
								)}
							</div>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Account status</p>
							<div className="mt-1">
								<Badge
									variant={user.state === "ACTIVE" ? "success" : "warning"}
								>
									{user.state}
								</Badge>
							</div>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Member since</p>
							<p className="mt-1 text-sm">
								{new Date(user.createdAt).toLocaleDateString(undefined, {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="border-destructive/30">
				<CardHeader>
					<CardTitle className="flex items-center gap-1.5 text-destructive">
						<ShieldAlert className="size-4" />
						Danger zone
					</CardTitle>
					<CardDescription>
						Permanently delete your account and every media item, transcript,
						generated content, and billing record tied to it. This starts an
						asynchronous workflow across every service and cannot be undone.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="destructive" onClick={() => setConfirmOpen(true)}>
						Delete account
					</Button>
				</CardContent>
			</Card>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete your account?</DialogTitle>
						<DialogDescription>
							Type <span className="font-medium text-foreground">delete</span>{" "}
							to confirm. This immediately removes your product access and
							starts permanent deletion across every service.
						</DialogDescription>
					</DialogHeader>
					<Input
						value={confirmText}
						onChange={(e) => setConfirmText(e.target.value)}
						placeholder="delete"
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setConfirmOpen(false);
								setConfirmText("");
							}}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={
								deleting || confirmText.trim().toLowerCase() !== "delete"
							}
							onClick={handleDelete}
						>
							{deleting ? "Requesting…" : "Delete account"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
