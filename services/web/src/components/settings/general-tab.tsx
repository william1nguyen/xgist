import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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

export function GeneralTab() {
	const { t } = useTranslation();
	const { user, logout } = useAuth();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [requestDeletion, { loading: deleting }] =
		useRequestAccountDeletionMutation();

	if (!user) return null;

	async function handleDelete() {
		try {
			await requestDeletion();
			toast.success(t("settings.general.successToast"));
			setConfirmOpen(false);
			await logout();
		} catch {
			toast.error(t("settings.general.errorToast"));
		}
	}

	return (
		<div className="flex flex-col gap-8">
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.general.profileTitle")}</CardTitle>
					<CardDescription>
						{t("settings.general.profileDescription")}
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
							<p className="text-muted-foreground text-xs">
								{t("settings.general.emailStatus")}
							</p>
							<div className="mt-1 flex items-center gap-1.5 text-sm">
								{user.emailVerified ? (
									<>
										<CheckCircle2 className="size-3.5 text-emerald-500" />
										{t("settings.general.verified")}
									</>
								) : (
									<>
										<AlertTriangle className="size-3.5 text-amber-500" />
										{t("settings.general.notVerified")}
									</>
								)}
							</div>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">
								{t("settings.general.accountStatus")}
							</p>
							<div className="mt-1">
								<Badge
									variant={user.state === "ACTIVE" ? "success" : "warning"}
								>
									{user.state}
								</Badge>
							</div>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">
								{t("settings.general.memberSince")}
							</p>
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
						{t("settings.general.dangerTitle")}
					</CardTitle>
					<CardDescription>
						{t("settings.general.dangerDescription")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="destructive" onClick={() => setConfirmOpen(true)}>
						{t("settings.general.deleteAccount")}
					</Button>
				</CardContent>
			</Card>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("settings.general.confirmTitle")}</DialogTitle>
						<DialogDescription>
							{t("settings.general.confirmDescription")}
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
							{t("common.cancel")}
						</Button>
						<Button
							variant="destructive"
							disabled={
								deleting || confirmText.trim().toLowerCase() !== "delete"
							}
							onClick={handleDelete}
						>
							{deleting
								? t("settings.general.requesting")
								: t("settings.general.deleteAccount")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
