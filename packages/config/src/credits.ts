import type { ProcessingOptions } from "@repo/types";

export const CREDIT_COSTS = {
	transcribe: 10,
	summarize: 20,
	extractKeywords: 5,
	extractMainIdeas: 10,
	generateNotes: 15,
	generateAudioSummary: 30,
} as const;

export type CreditCostKey = keyof typeof CREDIT_COSTS;

export function computeCreditCost(options: ProcessingOptions): number {
	return (Object.keys(CREDIT_COSTS) as CreditCostKey[]).reduce((total, key) => {
		return options[key] ? total + CREDIT_COSTS[key] : total;
	}, 0);
}
