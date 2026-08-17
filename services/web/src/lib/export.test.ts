import { describe, expect, it, vi } from "vitest";
import { downloadMarkdown, downloadPdf, downloadText } from "./export";

const SAMPLE_MARKDOWN = `# Meeting Notes

This has **bold**, *italic*, and \`inline code\` mixed in one paragraph so the
word-wrapper has to switch fonts mid-line across a fairly long run of text
that should wrap onto more than one line in the rendered PDF.

## Action Items

- Ship the *summary* export
- Fix the \`downloadPdf\` renderer
  - Nested sub-item
1. First
2. Second

> A blockquote spanning
> a couple of lines.

\`\`\`
const x = 1;
console.log(x);
\`\`\`

| Name | Status |
| --- | --- |
| Export | Done |
| Playback | Done |

---

Trailing paragraph after a horizontal rule.
`;

function captureDownload() {
	const clicks: string[] = [];
	const originalCreateElement = document.createElement.bind(document);
	vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
		const el = originalCreateElement(tag);
		if (tag === "a") {
			vi.spyOn(el, "click").mockImplementation(() => {
				clicks.push((el as HTMLAnchorElement).download);
			});
		}
		return el;
	});
	// jsdom doesn't implement these at all, so spyOn (which requires the
	// property to already exist) can't be used here — assign directly.
	URL.createObjectURL = vi.fn(() => "blob:mock");
	URL.revokeObjectURL = vi.fn();
	return clicks;
}

describe("note export", () => {
	it("downloads markdown with the raw source untouched", () => {
		const clicks = captureDownload();
		downloadMarkdown("My Note", "# raw **markdown**");
		expect(clicks).toEqual(["my-note.md"]);
	});

	it("downloads plain text", () => {
		const clicks = captureDownload();
		downloadText("My Note", "plain body");
		expect(clicks).toEqual(["my-note.txt"]);
	});

	it("renders a mixed-markdown note into a multi-element PDF without throwing", () => {
		// The value here is that the mdast walk/layout — headings, nested
		// lists, a blockquote, a fenced code block, a table, mid-paragraph
		// bold/italic/code runs, and a horizontal rule — completes without
		// hitting a runtime error. jsPDF's own save() mechanics in a
		// non-browser environment aren't what's under test.
		captureDownload();
		expect(() => downloadPdf("Meeting Notes", SAMPLE_MARKDOWN)).not.toThrow();
	});
});
