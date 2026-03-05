type NotesPanelProps = {
	notes: string;
};

export default function NotesPanel({ notes }: NotesPanelProps) {
	return (
		<div
			className="prose prose-sm prose-invert max-w-none overflow-y-auto"
			dangerouslySetInnerHTML={{ __html: markdownToHtml(notes) }}
		/>
	);
}

function markdownToHtml(md: string): string {
	return md
		.replace(/^### (.+)$/gm, "<h3>$1</h3>")
		.replace(/^## (.+)$/gm, "<h2>$1</h2>")
		.replace(/^# (.+)$/gm, "<h1>$1</h1>")
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/`(.+?)`/g, "<code>$1</code>")
		.replace(/^- (.+)$/gm, "<li>$1</li>")
		.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
		.replace(/\n\n/g, "</p><p>")
		.replace(/^(?!<[hul])(.+)$/gm, "<p>$1</p>");
}
