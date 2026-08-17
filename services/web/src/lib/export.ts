import { jsPDF } from "jspdf";
import type {
	BlockContent,
	Heading,
	List,
	ListItem,
	Paragraph,
	PhrasingContent,
	Root,
	RootContent,
	Table,
} from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

function slugify(title: string): string {
	return (
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "note"
	);
}

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export function downloadMarkdown(title: string, body: string) {
	triggerDownload(
		new Blob([body], { type: "text/markdown;charset=utf-8" }),
		`${slugify(title)}.md`,
	);
}

export function downloadText(title: string, body: string) {
	triggerDownload(
		new Blob([body], { type: "text/plain;charset=utf-8" }),
		`${slugify(title)}.txt`,
	);
}

export async function copyToClipboard(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}

// --- PDF export -------------------------------------------------------
//
// Walks the same mdast tree react-markdown renders the preview from
// (parsed with the same remark-gfm extensions) and lays it out with real
// jsPDF styling — bold/larger headings, bullets, blockquotes, code blocks,
// tables — instead of dumping the raw markdown source as flat text. This
// is a from-scratch word-wrapping layout rather than jsPDF's built-in
// splitTextToSize because that only handles a single font per call, and a
// note body mixes bold/italic/code runs within the same paragraph.

const PAGE_MARGIN = 48;
const BODY_SIZE = 11;
const LINE_HEIGHT = 15;

type Style = { bold: boolean; italic: boolean; code: boolean };

type Word = { text: string; style: Style };

type Cursor = { x: number; y: number };

type Layout = {
	doc: jsPDF;
	pageWidth: number;
	pageHeight: number;
};

function fontStyleName(style: Style): string {
	if (style.bold && style.italic) return "bolditalic";
	if (style.bold) return "bold";
	if (style.italic) return "italic";
	return "normal";
}

function applyFont(doc: jsPDF, style: Style, size: number) {
	doc.setFont(style.code ? "courier" : "helvetica", fontStyleName(style));
	doc.setFontSize(style.code ? size - 0.5 : size);
}

function ensureSpace(layout: Layout, cursor: Cursor, needed: number) {
	if (cursor.y + needed > layout.pageHeight - PAGE_MARGIN) {
		layout.doc.addPage();
		cursor.y = PAGE_MARGIN;
	}
}

function flattenInline(children: PhrasingContent[], style: Style): Word[] {
	const words: Word[] = [];
	for (const node of children) {
		switch (node.type) {
			case "text":
				for (const w of node.value.split(/\s+/).filter(Boolean)) {
					words.push({ text: w, style });
				}
				break;
			case "strong":
				words.push(...flattenInline(node.children, { ...style, bold: true }));
				break;
			case "emphasis":
				words.push(...flattenInline(node.children, { ...style, italic: true }));
				break;
			case "inlineCode":
				for (const w of node.value.split(/\s+/).filter(Boolean)) {
					words.push({ text: w, style: { ...style, code: true } });
				}
				break;
			case "link":
				words.push(...flattenInline(node.children, style));
				break;
			case "break":
				words.push({ text: "\n", style });
				break;
			default:
				if ("children" in node) {
					words.push(
						...flattenInline(node.children as PhrasingContent[], style),
					);
				}
		}
	}
	return words;
}

// Renders wrapped, mixed-style inline content with a hanging indent
// (wrapped lines align under the first word, not under a leading bullet).
function renderInline(
	layout: Layout,
	cursor: Cursor,
	children: PhrasingContent[],
	opts: {
		x0: number;
		maxX: number;
		size: number;
		lineHeight: number;
		baseStyle?: Style;
	},
) {
	const { doc } = layout;
	const baseStyle = opts.baseStyle ?? {
		bold: false,
		italic: false,
		code: false,
	};
	const words = flattenInline(children, baseStyle);
	const spaceWidth = ((): number => {
		applyFont(doc, baseStyle, opts.size);
		return doc.getTextWidth(" ");
	})();

	cursor.x = opts.x0;
	let atLineStart = true;

	for (const word of words) {
		if (word.text === "\n") {
			ensureSpace(layout, cursor, opts.lineHeight);
			cursor.y += opts.lineHeight;
			cursor.x = opts.x0;
			atLineStart = true;
			continue;
		}
		applyFont(doc, word.style, opts.size);
		const width = doc.getTextWidth(word.text);
		if (!atLineStart && cursor.x + width > opts.maxX) {
			ensureSpace(layout, cursor, opts.lineHeight);
			cursor.y += opts.lineHeight;
			cursor.x = opts.x0;
			atLineStart = true;
		} else {
			ensureSpace(layout, cursor, opts.lineHeight);
		}
		doc.text(word.text, cursor.x, cursor.y);
		cursor.x += width + spaceWidth;
		atLineStart = false;
	}
	// Leaves cursor.y at the next unused baseline rather than the last
	// drawn line's baseline — otherwise every block after this one starts
	// its own leading margin from on top of this block's last line
	// instead of below it (most visible as overlapping list items, since
	// their leading margin between items is small).
	if (words.length > 0) cursor.y += opts.lineHeight;
}

const HEADING_SIZES: Record<number, number> = {
	1: 19,
	2: 16,
	3: 14,
	4: 12.5,
	5: 11.5,
	6: 11,
};

function renderHeading(
	layout: Layout,
	cursor: Cursor,
	node: Heading,
	x0: number,
	maxX: number,
) {
	const size = HEADING_SIZES[node.depth] ?? 11;
	cursor.y += LINE_HEIGHT * 0.6;
	ensureSpace(layout, cursor, size);
	cursor.y += size * 0.8;
	renderInline(layout, cursor, node.children, {
		x0,
		maxX,
		size,
		lineHeight: size + 3,
	});
	cursor.y += LINE_HEIGHT * 0.3;
}

function renderParagraph(
	layout: Layout,
	cursor: Cursor,
	node: Paragraph,
	x0: number,
	maxX: number,
) {
	cursor.y += LINE_HEIGHT * 0.7;
	renderInline(layout, cursor, node.children, {
		x0,
		maxX,
		size: BODY_SIZE,
		lineHeight: LINE_HEIGHT,
	});
}

function renderList(
	layout: Layout,
	cursor: Cursor,
	node: List,
	x0: number,
	maxX: number,
	depth: number,
) {
	const indent = 16;
	let index = node.start ?? 1;
	for (const item of node.children as ListItem[]) {
		const marker = node.ordered ? `${index}.` : "•";
		index += 1;
		const markerX = x0 + depth * indent;
		const textX = markerX + (node.ordered ? 20 : 14);

		let firstBlock = true;
		for (const child of item.children as BlockContent[]) {
			if (child.type === "list") {
				renderList(layout, cursor, child, x0, maxX, depth + 1);
				continue;
			}
			cursor.y += firstBlock ? LINE_HEIGHT * 0.35 : LINE_HEIGHT * 0.2;
			if (firstBlock) {
				applyFont(
					layout.doc,
					{ bold: false, italic: false, code: false },
					BODY_SIZE,
				);
				ensureSpace(layout, cursor, LINE_HEIGHT);
				layout.doc.text(marker, markerX, cursor.y);
			}
			if (child.type === "paragraph") {
				renderInline(layout, cursor, child.children, {
					x0: textX,
					maxX,
					size: BODY_SIZE,
					lineHeight: LINE_HEIGHT,
				});
			}
			firstBlock = false;
		}
	}
}

function renderBlockquote(
	layout: Layout,
	cursor: Cursor,
	node: BlockContent & { children: BlockContent[] },
	x0: number,
	maxX: number,
) {
	cursor.y += LINE_HEIGHT * 0.5;
	const startY = cursor.y - LINE_HEIGHT * 0.6;
	const indent = 16;
	for (const child of node.children) {
		if (child.type === "paragraph") {
			cursor.y += LINE_HEIGHT * 0.3;
			renderInline(layout, cursor, child.children, {
				x0: x0 + indent,
				maxX,
				size: BODY_SIZE,
				lineHeight: LINE_HEIGHT,
				baseStyle: { bold: false, italic: true, code: false },
			});
		}
	}
	const endY = cursor.y - LINE_HEIGHT + 4;
	layout.doc.setDrawColor(180);
	layout.doc.setLineWidth(1.5);
	layout.doc.line(x0 + 2, startY, x0 + 2, endY);
}

function renderCodeBlock(
	layout: Layout,
	cursor: Cursor,
	value: string,
	x0: number,
	maxX: number,
) {
	const { doc } = layout;
	cursor.y += LINE_HEIGHT * 0.6;
	doc.setFont("courier", "normal");
	doc.setFontSize(9.5);
	const lines = value.split("\n");
	const blockHeight = lines.length * 12 + 12;
	ensureSpace(layout, cursor, blockHeight);
	doc.setFillColor(240, 240, 240);
	doc.rect(x0, cursor.y - 9, maxX - x0, blockHeight, "F");
	cursor.y += 4;
	for (const line of lines) {
		ensureSpace(layout, cursor, 12);
		doc.text(line, x0 + 6, cursor.y);
		cursor.y += 12;
	}
	cursor.y += 6;
}

function renderTable(
	layout: Layout,
	cursor: Cursor,
	node: Table,
	x0: number,
	maxX: number,
) {
	const { doc } = layout;
	const rows = node.children;
	if (rows.length === 0) return;
	const colCount = rows[0].children.length;
	const colWidth = (maxX - x0) / colCount;
	const cellPad = 4;

	cursor.y += LINE_HEIGHT * 0.5;

	for (let r = 0; r < rows.length; r++) {
		const isHeader = r === 0;
		const cells = rows[r].children;
		const cellLines: string[][] = cells.map((cell) => {
			const text = flattenInline(cell.children, {
				bold: isHeader,
				italic: false,
				code: false,
			})
				.map((w) => w.text)
				.join(" ");
			applyFont(
				doc,
				{ bold: isHeader, italic: false, code: false },
				BODY_SIZE - 1,
			);
			return doc.splitTextToSize(text, colWidth - cellPad * 2) as string[];
		});
		const rowLines = Math.max(1, ...cellLines.map((l) => l.length));
		const rowHeight = rowLines * 12 + cellPad * 2;

		ensureSpace(layout, cursor, rowHeight);
		const rowTop = cursor.y - 9;
		for (let c = 0; c < colCount; c++) {
			doc.setDrawColor(200);
			doc.rect(x0 + c * colWidth, rowTop, colWidth, rowHeight);
			applyFont(
				doc,
				{ bold: isHeader, italic: false, code: false },
				BODY_SIZE - 1,
			);
			let ty = cursor.y;
			for (const line of cellLines[c] ?? []) {
				doc.text(line, x0 + c * colWidth + cellPad, ty);
				ty += 12;
			}
		}
		cursor.y += rowHeight;
	}
	cursor.y += 6;
}

function renderNode(
	layout: Layout,
	cursor: Cursor,
	node: RootContent,
	x0: number,
	maxX: number,
) {
	switch (node.type) {
		case "heading":
			renderHeading(layout, cursor, node, x0, maxX);
			break;
		case "paragraph":
			renderParagraph(layout, cursor, node, x0, maxX);
			break;
		case "list":
			renderList(layout, cursor, node, x0, maxX, 0);
			break;
		case "blockquote":
			renderBlockquote(layout, cursor, node as never, x0, maxX);
			break;
		case "code":
			renderCodeBlock(layout, cursor, node.value, x0, maxX);
			break;
		case "table":
			renderTable(layout, cursor, node, x0, maxX);
			break;
		case "thematicBreak":
			cursor.y += LINE_HEIGHT * 0.5;
			ensureSpace(layout, cursor, LINE_HEIGHT);
			layout.doc.setDrawColor(200);
			layout.doc.line(x0, cursor.y, maxX, cursor.y);
			cursor.y += LINE_HEIGHT * 0.5;
			break;
		default:
			break;
	}
}

export function downloadPdf(title: string, markdownBody: string) {
	const tree = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.parse(markdownBody) as Root;

	const doc = new jsPDF({ unit: "pt", format: "a4" });
	const layout: Layout = {
		doc,
		pageWidth: doc.internal.pageSize.getWidth(),
		pageHeight: doc.internal.pageSize.getHeight(),
	};
	const x0 = PAGE_MARGIN;
	const maxX = layout.pageWidth - PAGE_MARGIN;
	const cursor: Cursor = { x: x0, y: PAGE_MARGIN };

	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.text(title, x0, cursor.y);
	cursor.y += 24;

	for (const node of tree.children) {
		renderNode(layout, cursor, node, x0, maxX);
	}

	doc.save(`${slugify(title)}.pdf`);
}
