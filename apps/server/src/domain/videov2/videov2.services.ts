import _ from "lodash";
import { SummarizedFailedError, VideoInvalidError } from "./videov2.errors";
import { SummarizeVideoBody } from "./videov2.types";
import { transcribeStream } from "~/infra/whisper";
import { prompting } from "~/infra/models";

export const summary = async (text: string, chunks: any) => {
  const example = `
    Example of good summary points with evidence:
    Original transcript excerpt:
    "The rise of smartphone adoption has drastically changed how we communicate. In 2010, only 35% of Americans had smartphones. By 2021, that number has risen to over 85%. This shift has impacted everything from social interactions to business operations."

    Good summary point:
    {
      "text": "Smartphone adoption in America increased dramatically from 35% in 2010 to over 85% in 2021, revolutionizing communication patterns.",
      "supporting_sentences": [
        {
          "text": "In 2010, only 35% of Americans had smartphones. By 2021, that number has risen to over 85%.",
          "time": "00:01:25"
        },
        {
          "text": "The rise of smartphone adoption has drastically changed how we communicate.",
          "time": "00:01:25"
        }
      ]
    }
  `;

  const instruction = `
    Follow this process, return ONLY a valid JSON object with the following structure, without any additional text, code formatting, prefixes, or line numbers:
      Step 1: Read through the entire transcript to understand the main topic and key ideas.
      Step 2: Identify the most important points that represent the core message.
      Step 3: For each important point, find specific sentences in the transcript that provide evidence for that point.
      Step 4: Create concise summary statements that capture these key points.
      Step 5: Match each summary statement with its supporting evidence and timestamps.
      Step 6: Format everything into the required JSON structure.
  `;

  const rule = `
    IMPORTANT: 
      1. Focus on preserving the key points and main message of the transcript
      2. Make each summary point concise but informative
      3. Do not include any text outside the JSON object
      4. Do not add markdown code blocks, backticks, or any other formatting
      5. Do not include numbering or bullet points
      6. Ensure the response is a valid, parseable JSON object
      7. Each summary point should be supported by relevant sentences from the transcript
      8. Do not add any explanations before or after the JSON
  `;

  const prompt = `
    ${example}
    ${instruction}

    Transcript:
    ${text}

    Time-stamped segments:
    ${JSON.stringify(chunks)}

    Return ONLY a valid JSON object with the following structure, without any additional text, code formatting, prefixes, or line numbers:

    [
      {
        "text": "concise summary point that represents a key idea",
        "supporting_sentences": [
          {
            "text": "The 'text' value from the first relevant item in 'Time-stamped segments'",
            "time": "The 'time' value from the first relevant item in 'Time-stamped segments'"
          },
          {
            "text": "The 'text' value from the second relevant item in 'Time-stamped segments'",
            "time": "The 'time' value from the second relevant item in 'Time-stamped segments'"
          }
        ]
      }
    ]

    ${rule}
  `;

  try {
    let res = await prompting(prompt);
    res = res.replace("```json", "").replace("```", "");
    res = JSON.parse(res);
    return res;
  } catch (err) {
    throw err;
  }
};

export const summarize = async (text: string, chunks: any) => {
  const prompt = `
    Short summarize the following transcript concisely while preserving the key points and main message,
    and identify supporting evidence for each key point.

    Transcript:
    ${text}

    Time-stamped segments:
    ${JSON.stringify(chunks)}

    Return ONLY a valid JSON object with the following structure, without any additional text, code formatting, prefixes, or line numbers:

    [
      {
        "text": "concise summary point that represents a key idea",
        "supporting_sentences": [
          {
            "text": "The 'text' value from the first relevant item in 'Time-stamped segments'",
            "time": "The 'time' value from the first relevant item in 'Time-stamped segments'"
          },
          {
            "text": "The 'text' value from the second relevant item in 'Time-stamped segments'",
            "time": "The 'time' value from the second relevant item in 'Time-stamped segments'"
          }
        ]
      }
    ]

    IMPORTANT: 
    1. Focus on preserving the key points and main message of the transcript
    2. Make each summary point concise but informative
    3. Do not include any text outside the JSON object
    4. Do not add markdown code blocks, backticks, or any other formatting
    5. Do not include numbering or bullet points
    6. Ensure the response is a valid, parseable JSON object
    7. Each summary point should be supported by relevant sentences from the transcript
    8. Do not add any explanations before or after the JSON
  `;

  try {
    let res = await prompting(prompt);
    res = res.replace("```json", "").replace("```", "");
    res = JSON.parse(res);
    return res;
  } catch (err) {
    throw err;
  }
};

export const summarizeBuffer = async (buffer: Buffer) => {
  try {
    const transcripts = await transcribeStream(buffer);
    const { text, chunks } = transcripts;

    const summary = await summarize(text, chunks);
    let summaryText = "";

    if (Array.isArray(summary) && summary.length > 0) {
      summaryText = summary.reduce((acc, item, index) => {
        if (item && item.text) {
          return acc + item.text + (index < summary.length - 1 ? " " : "");
        }
        return acc;
      }, "");
    }

    return {
      summary,
      summaryText,
      transcripts,
    };
  } catch (error) {
    throw new SummarizedFailedError();
  }
};

export const summarizeVideo = async ({ videoFile }: SummarizeVideoBody) => {
  if (!videoFile) {
    throw new VideoInvalidError();
  }

  const buffer = videoFile._buf;
  const res = await summarizeBuffer(buffer);
  return res;
};
