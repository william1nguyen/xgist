import { promptingv1 } from "./gemini";

export const prompting = async (prompt: string) => {
  return promptingv1(prompt);
};
