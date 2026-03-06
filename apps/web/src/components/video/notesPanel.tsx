type NotesPanelProps = {
	notes: string;
};

type Block =
	| { type: "h1" | "h2" | "h3"; id: string; text: string }
	| { type: "ul"; id: string; items: string[] }
	| { type: "p"; id: string; text: string };

function parseMarkdown(md: string): Block[] {
	const blocks: Block[] = [];
	const lines = md.split("\n");
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (line.startsWith("### ")) {
			const text = line.slice(4);
			blocks.push({ type: "h3", id: `h3-${blocks.length}`, text });
		} else if (line.startsWith("## ")) {
			const text = line.slice(3);
			blocks.push({ type: "h2", id: `h2-${blocks.length}`, text });
		} else if (line.startsWith("# ")) {
			const text = line.slice(2);
			blocks.push({ type: "h1", id: `h1-${blocks.length}`, text });
		} else if (line.startsWith("- ")) {
			const items: string[] = [line.slice(2)];
			while (i + 1 < lines.length && lines[i + 1].startsWith("- ")) {
				i++;
				items.push(lines[i].slice(2));
			}
			blocks.push({ type: "ul", id: `ul-${blocks.length}`, items });
		} else if (line.trim()) {
			blocks.push({ type: "p", id: `p-${blocks.length}`, text: line });
		}

		i++;
	}

	return blocks;
}

export default function NotesPanel({ notes }: NotesPanelProps) {
	const blocks = parseMarkdown(notes);

	return (
		<div className="prose prose-sm prose-invert max-w-none space-y-2 overflow-y-auto">
			{blocks.map((block) => {
				if (block.type === "h1") {
					return (
						<h1 key={block.id} className="font-bold text-lg">
							{block.text}
						</h1>
					);
				}
				if (block.type === "h2") {
					return (
						<h2 key={block.id} className="font-semibold text-base">
							{block.text}
						</h2>
					);
				}
				if (block.type === "h3") {
					return (
						<h3 key={block.id} className="font-semibold text-sm">
							{block.text}
						</h3>
					);
				}
				if (block.type === "ul") {
					return (
						<ul key={block.id} className="list-disc space-y-1 pl-4">
							{block.items.map((item) => (
								<li key={item} className="text-sm">
									{item}
								</li>
							))}
						</ul>
					);
				}
				return (
					<p key={block.id} className="text-sm leading-relaxed">
						{block.text}
					</p>
				);
			})}
		</div>
	);
}
