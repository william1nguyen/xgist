import { db } from "@xgist/db"
import { videos, transcriptSegments, summaries, summaryRefs } from "@xgist/db/schema/media"
import { STREAM_KEYS, CONSUMER_GROUPS } from "@xgist/config"
import { eq } from "@xgist/db"
import type { Redis } from "ioredis"
import type { ResultPayload } from "@repo/types"

type TranscriptItem = ResultPayload["transcript"][number]
type SummaryRefItem = ResultPayload["summaryRefs"][number]

const CONSUMER_NAME = "consumer-1"
const BLOCK_MS = 5000
const COUNT = 10

type StreamEntry = [id: string, fields: string[]]

function parseFields(fields: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < fields.length; i += 2) {
    const key = fields[i]
    const value = fields[i + 1]
    if (key !== undefined && value !== undefined) {
      result[key] = value
    }
  }
  return result
}

async function processResult(payload: ResultPayload) {
  if (payload.status === "failed") {
    await db
      .update(videos)
      .set({ status: "failed" })
      .where(eq(videos.id, payload.videoId))
    return
  }

  await db.transaction(async (tx) => {
    if (payload.transcript.length > 0) {
      await tx.insert(transcriptSegments).values(
        payload.transcript.map((seg: TranscriptItem, index: number) => ({
          videoId: payload.videoId,
          index,
          start: seg.start,
          end: seg.end,
          text: seg.text,
        })),
      )
    }

    if (payload.summary) {
      const [inserted] = await tx
        .insert(summaries)
        .values({
          videoId: payload.videoId,
          summary: payload.summary,
          keywords: payload.keywords,
          mainIdeas: payload.mainIdeas,
          notes: payload.notes,
          audioSummaryUrl: payload.audioSummaryUrl,
        })
        .onConflictDoUpdate({
          target: summaries.videoId,
          set: {
            summary: payload.summary,
            keywords: payload.keywords,
            mainIdeas: payload.mainIdeas,
            notes: payload.notes,
            audioSummaryUrl: payload.audioSummaryUrl,
          },
        })
        .returning()

      if (inserted && payload.summaryRefs.length > 0) {
        await tx.insert(summaryRefs).values(
          payload.summaryRefs.map((ref: SummaryRefItem) => ({
            summaryId: inserted.id,
            sentenceIndex: ref.sentenceIndex,
            transcriptIndices: ref.transcriptIndices,
          })),
        )
      }
    }

    await tx
      .update(videos)
      .set({ status: "completed" })
      .where(eq(videos.id, payload.videoId))
  })
}

async function ensureConsumerGroup(redis: Redis) {
  try {
    await redis.xgroup("CREATE", STREAM_KEYS.results, CONSUMER_GROUPS.server, "0", "MKSTREAM")
  } catch (err) {
    const error = err as { message?: string }
    if (!error.message?.includes("BUSYGROUP")) throw err
  }
}

export function startResultConsumer(redis: Redis) {
  void (async () => {
    await ensureConsumerGroup(redis)

    while (true) {
      const results = await redis.xreadgroup(
        "GROUP",
        CONSUMER_GROUPS.server,
        CONSUMER_NAME,
        "COUNT",
        COUNT,
        "BLOCK",
        BLOCK_MS,
        "STREAMS",
        STREAM_KEYS.results,
        ">",
      )

      if (!results) continue

      for (const [, entries] of results as [string, StreamEntry[]][]) {
        for (const [id, fields] of entries) {
          const parsed = parseFields(fields)
          const payload: ResultPayload = {
            jobId: parsed["jobId"] ?? "",
            videoId: parsed["videoId"] ?? "",
            status: (parsed["status"] as "completed" | "failed") ?? "failed",
            error: parsed["error"] ?? null,
            transcript: parsed["transcript"] ? JSON.parse(parsed["transcript"]) : [],
            summary: parsed["summary"] ?? null,
            summaryRefs: parsed["summaryRefs"] ? JSON.parse(parsed["summaryRefs"]) : [],
            keywords: parsed["keywords"] ? JSON.parse(parsed["keywords"]) : [],
            mainIdeas: parsed["mainIdeas"] ? JSON.parse(parsed["mainIdeas"]) : [],
            notes: parsed["notes"] ?? null,
            audioSummaryUrl: parsed["audioSummaryUrl"] ?? null,
          }

          await processResult(payload)
          await redis.xack(STREAM_KEYS.results, CONSUMER_GROUPS.server, id)
        }
      }
    }
  })()
}
