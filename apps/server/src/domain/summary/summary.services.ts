import { prompting } from "~/infra/gemini";

export const summarize = async (text: string) => {
  const prompt = `
    Summarize the following transcript concisely while preserving the key points and main message:
    ${text}
  `;

  const res = await prompting(prompt);
  return res;
};

export const extractKeyPoints = async (text: string): Promise<string[]> => {
  const prompt = `
    Extract the 3-5 main ideas from the following transcript.
    
    Transcript:
    ${text}
    
    Respond with a list of the main ideas only, one per line, with no numbering or bullet points.
    Each main idea should be a concise statement.
  `;

  const res = await prompting(prompt);

  return res
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
};

export const extractKeyWords = async (text: string): Promise<string[]> => {
  const prompt = `
    Extract the 10 most significant keywords or key phrases from the following transcript.
    Transcript:
    ${text}
    Respond with a list of keywords or key phrases only, one per line, with no numbering or bullet points.
  `;

  const res = await prompting(prompt);

  return res
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
};

export const getSummaryInfo = async ({}) => {};

export const updateSummaryInfo = async () => {};
