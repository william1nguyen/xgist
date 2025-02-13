import {spawn} from 'node:child_process';
import {Readable} from 'node:stream';
import axios from 'axios';

export const splitAudioFile = (
  fileBuffer: Buffer,
  chunkDuration: number
): Promise<Buffer[]> => {
  return new Promise((resolve, reject) => {
    const outputChunks: Buffer[] = [];

    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);

    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0',
      '-f',
      'segment',
      '-segment_time',
      chunkDuration.toString(),
      '-f',
      'wav',
      'pipe:1',
    ]);

    bufferStream.pipe(ffmpeg.stdin);

    ffmpeg.stdout.on('data', (data) => outputChunks.push(data));
    ffmpeg.on('exit', () => resolve(outputChunks));
    ffmpeg.on('error', reject);
  });
};

export const transcribeAudio = async (audioBuffer: Buffer) => {
  try {
    const url = process.env.HUGGINGFACE_WHISPERAI_URL as string;
    const headers = {
      Authorization: `Bearer ${process.env.HUGGINGFACE_WHISPERAI_ACCESS_TOKEN}`,
      'Content-Type': 'application/octet-stream',
    };
    console.log(url, headers);
    const response = await axios.post(url, audioBuffer, {
      headers,
      responseType: 'json',
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Transcription API error: ${
          error.response?.statusText || error.message
        }`
      );
    }
    throw new Error(`Unexpected error: ${error}`);
  }
};
