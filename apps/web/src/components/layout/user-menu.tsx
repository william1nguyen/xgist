import { LogOut, Trash2, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRequestAccountDeletionMutation } from "@/graphql/generated/graphql";
import { useAuth } from "@/hooks/useAuth";

export function UserMenu() {
	const { user, logout } = useAuth();
	const [confirmOpen, setConfirmOpen] = useState(false);
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
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25"
					>
						<UserIcon className="size-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuLabel>
						<div className="flex flex-col gap-0.5">
							<span className="truncate font-medium">{user.name}</span>
							<span className="truncate font-normal text-muted-foreground text-xs">
								{user.email}
							</span>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => logout()}>
						<LogOut className="size-4" />
						Sign out
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => setConfirmOpen(true)}
					>
						<Trash2 className="size-4" />
						Delete account
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete your account?</DialogTitle>
						<DialogDescription>
							This starts an asynchronous deletion workflow across every service
							— your media, transcripts, generated content, and billing records
							will be removed. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={deleting}
							onClick={handleDelete}
						>
							{deleting ? "Requesting…" : "Delete account"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
