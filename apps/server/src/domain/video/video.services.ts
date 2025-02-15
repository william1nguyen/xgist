import _, { sum } from "lodash";
import logger from "~/infra/logger";
import axios from "axios";
import { env } from "~/env";
import FormData from "form-data";
import { GeminiResponse, UploadVideoBody } from "./video.types";
import {
  FileTypeNotAllowedError,
  VideoContentInvalidError,
  VideoUploadNotFoundError,
} from "./video.errors";
import { transcribeQueue } from "~/infra/jobs/workers/transcribe";
import { uploadFileToMinio } from "~/infra/minio";

enum AllowedMimeTypes {
  mp4 = "video/mp4",
}

const isMimeTypeAllowed = (mimeType: string) => {
  return (Object.values(AllowedMimeTypes) as string[]).includes(mimeType);
};

export const getTranscript = async (fileBuffer: Buffer, fileName: string) => {
  try {
    const form = new FormData();

    form.append("files", fileBuffer, {
      filename: fileName,
      contentType: "video/mp4",
      knownLength: fileBuffer.length,
    });

    const res = await axios.post(`${env.WHISPERAI_URL}/transcribe`, form, {
      headers: {
        ...form.getHeaders(),
        Accept: "application/json",
      },
    });
    const data = res.data;

    return data.transcriptions[fileName];
  } catch (err) {
    logger.error(`Failed to get transcript ${err}`);
    return null;
  }
};

export const isVideoContentValid = async (content: string) => {
  if (!content) return false;

  try {
    const url = `${env.GEMINI_FLASH_URL}?key=${env.GOOGLE_API_KEY}`;
    const headers = {
      "Content-Type": "application/json",
    };
    const prompt = `
    Use your general knowledge and check if this content is academically related or it provides some source of knowledge, experience or stories:
      ${content}
    Rule:
      - Only return boolean: true or false
  `;
    const res = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      { headers }
    );
    const data = res.data as GeminiResponse;
    const isAcademic = JSON.parse(
      _.first(_.first(data.candidates)?.content.parts)?.text as string
    );
    return isAcademic;
  } catch (err) {
    logger.error(err);
    return false;
  }
};

export const getSummary = async (transcript: string) => {
  const url = `${env.GEMINI_FLASH_URL}?key=${env.GOOGLE_API_KEY}`;
  const headers = {
    "Content-Type": "application/json",
  };
  const prompt = `Use your general knowledge and give me short description/summary for: ${transcript}`;
  const res = await axios.post(
    url,
    {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    },
    { headers }
  );
  const data = res.data as GeminiResponse;
  const summary = _.first(_.first(data.candidates)?.content.parts)
    ?.text as string;
  return summary;
};

export const handleCreateVideo = async (
  mimeType: string,
  fileName: string,
  fileBuffer: Buffer
) => {
  if (!isMimeTypeAllowed(mimeType)) {
    throw new FileTypeNotAllowedError();
  }

  const transcript = await getTranscript(fileBuffer, fileName);
  const category = (await isVideoContentValid(transcript))
    ? "academic"
    : "entertainment";

  if (category !== "academic") {
    throw new VideoContentInvalidError();
  }

  const summary = await getSummary(transcript);
  const url = await uploadFileToMinio("videos", fileName, mimeType, fileBuffer);

  return {
    url,
    transcript,
    summary,
  };
};

export const createVideo = async ({ file }: UploadVideoBody) => {
  if (!file) {
    throw new VideoUploadNotFoundError();
  }

  const mimeType = file.mimetype;
  const fileName = file.filename;
  const fileBuffer = (await file.toBuffer()) as Buffer;

  const encodedData = Buffer.from(fileBuffer).toString("base64");

  await transcribeQueue.add("transcribe", {
    mimeType,
    fileName,
    encodedData,
  });

  return {
    msg: "acknowledged",
  };
};
