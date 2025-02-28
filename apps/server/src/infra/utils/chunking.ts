import { spawn } from "node:child_process";
import { Readable } from "node:stream";

export const chunking = (
  buffer: Buffer,
  duration: number
): Promise<Buffer[]> => {
  return new Promise((resolve, reject) => {
    const output: Buffer[] = [];

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const ffmpeg = spawn("ffmpeg", [
      "-i",
      "pipe:0",
      "-f",
      "segment",
      "-segment_time",
      duration.toString(),
      "-f",
      "wav",
      "pipe:1",
    ]);

    stream.pipe(ffmpeg.stdin);

    ffmpeg.stdout.on("data", (data) => output.push(data));
    ffmpeg.on("exit", () => resolve(output));
    ffmpeg.on("error", reject);
  });
};
