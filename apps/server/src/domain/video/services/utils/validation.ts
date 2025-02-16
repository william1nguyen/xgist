import axios from "axios";
import _ from "lodash";
import { env } from "~/env";
import logger from "~/infra/logger";
import type { GeminiResponse } from "../../video.types";

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
