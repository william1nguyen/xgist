import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("~/infra/whisper", () => ({
  transcribeStream: vi.fn(async (_buffer: Buffer) => ({
    text: "This is a transcript of the uploaded content.",
    chunks: [
      { time: 0, text: "This is" },
      { time: 1, text: "a transcript" },
    ],
  })),
}));

vi.mock("~/infra/models", () => ({
  prompting: vi.fn(async (prompt: string) => {
    if (prompt.includes("Extract the 3-5 main ideas")) {
      return "Idea one\nIdea two\nIdea three";
    }
    if (prompt.includes("Extract the 10 most significant keywords")) {
      return "keyword one\nkeyword two\nkeyword three";
    }
    return "This is a concise summary.";
  }),
}));

// Import after mocks
import {
  summarizeBuffer,
  summarizeVideo,
  extractKeyPoints,
  extractKeyWords,
  summarize,
} from "~/domain/video/video.services";

describe("video.services summarization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("summarize() returns summarized text", async () => {
    const res = await summarize("some transcript");
    expect(res).toContain("concise summary");
  });

  it("extractKeyPoints() parses list into array", async () => {
    const points = await extractKeyPoints("sample");
    expect(points).toEqual(["Idea one", "Idea two", "Idea three"]);
  });

  it("extractKeyWords() parses list into array", async () => {
    const keywords = await extractKeyWords("sample");
    expect(keywords).toEqual(["keyword one", "keyword two", "keyword three"]);
  });

  it("summarizeBuffer() returns summary, keyPoints, keywords, transcripts", async () => {
    const buffer = Buffer.from("fake");
    const res = await summarizeBuffer(buffer, true, true);
    expect(res.summary).toBeTruthy();
    expect(res.keyPoints).toHaveLength(3);
    expect(res.keywords).toHaveLength(3);
    expect(res.transcripts.text).toContain("transcript");
  });

  it("summarizeVideo() respects optional flags", async () => {
    const fakeFile: any = { _buf: Buffer.from("video-bytes") };
    // Disable extracting keywords
    const res = await summarizeVideo({
      videoFile: fakeFile,
      keyPoints: { value: true } as any,
      keywords: { value: false } as any,
    } as any);

    expect(res.summary).toBeTruthy();
    expect(res.keyPoints).toBeTruthy();
    expect(res.keywords).toBeNull();
  });
});


