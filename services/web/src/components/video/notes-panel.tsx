import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContentDetailQuery } from "@/graphql/generated/graphql";
import {
	copyToClipboard,
	downloadMarkdown,
	downloadPdf,
	downloadText,
} from "@/lib/export";

type Note = ContentDetailQuery["contentDetail"]["notes"][number];

export function NotesPanel({
	notes,
	mediaTitle,
}: {
	notes: Note[];
	mediaTitle: string;
}) {
	const { t } = useTranslation();
	if (notes.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">{t("video.noNotes")}</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{notes.map((note) => (
				<NoteCard
					key={`${note.format}-${note.createdAt}`}
					note={note}
					mediaTitle={mediaTitle}
				/>
			))}
		</div>
	);
}

function NoteCard({ note, mediaTitle }: { note: Note; mediaTitle: string }) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const title = `${mediaTitle} — notes`;

	async function handleCopy() {
		await copyToClipboard(note.body);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-end gap-1">
				<Button variant="ghost" size="sm" onClick={handleCopy}>
					{copied ? (
						<Check className="size-3.5" />
					) : (
						<Copy className="size-3.5" />
					)}
					{copied ? t("common.copied") : t("common.copy")}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm">
							<Download className="size-3.5" />
							{t("common.download")}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onSelect={() => downloadMarkdown(title, note.body)}
						>
							{t("video.downloadMarkdown")}
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => downloadText(title, note.body)}>
							{t("video.downloadText")}
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => downloadPdf(title, note.body)}>
							{t("video.downloadPdf")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<div className="prose">
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
			</div>
		</div>
	);
}
