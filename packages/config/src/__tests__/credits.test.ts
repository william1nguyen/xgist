// Feature: mediamind-full-platform, Property 1: Credit cost computation is additive over options

import type { ProcessingOptions } from "@repo/types";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CREDIT_COSTS, computeCreditCost } from "../credits";
import { CONSUMER_GROUPS, STREAM_KEYS } from "../streams";

const processingOptionsArb = fc.record<ProcessingOptions>({
	transcribe: fc.boolean(),
	summarize: fc.boolean(),
	extractKeywords: fc.boolean(),
	extractMainIdeas: fc.boolean(),
	generateNotes: fc.boolean(),
	generateAudioSummary: fc.boolean(),
});

describe("CREDIT_COSTS", () => {
	it("has exact values", () => {
		expect(CREDIT_COSTS.transcribe).toBe(10);
		expect(CREDIT_COSTS.summarize).toBe(20);
		expect(CREDIT_COSTS.extractKeywords).toBe(5);
		expect(CREDIT_COSTS.extractMainIdeas).toBe(10);
		expect(CREDIT_COSTS.generateNotes).toBe(15);
		expect(CREDIT_COSTS.generateAudioSummary).toBe(30);
	});
});

describe("STREAM_KEYS", () => {
	it("has exact values", () => {
		expect(STREAM_KEYS.jobs).toBe("stream:jobs");
		expect(STREAM_KEYS.results).toBe("stream:results");
	});
});

describe("CONSUMER_GROUPS", () => {
	it("has exact values", () => {
		expect(CONSUMER_GROUPS.workers).toBe("workers");
		expect(CONSUMER_GROUPS.server).toBe("server");
	});
});

describe("computeCreditCost", () => {
	it("returns 0 when all options are false", () => {
		const options: ProcessingOptions = {
			transcribe: false,
			summarize: false,
			extractKeywords: false,
			extractMainIdeas: false,
			generateNotes: false,
			generateAudioSummary: false,
		};
		expect(computeCreditCost(options)).toBe(0);
	});

	it("returns full cost when all options are true", () => {
		const options: ProcessingOptions = {
			transcribe: true,
			summarize: true,
			extractKeywords: true,
			extractMainIdeas: true,
			generateNotes: true,
			generateAudioSummary: true,
		};
		const expected =
			CREDIT_COSTS.transcribe +
			CREDIT_COSTS.summarize +
			CREDIT_COSTS.extractKeywords +
			CREDIT_COSTS.extractMainIdeas +
			CREDIT_COSTS.generateNotes +
			CREDIT_COSTS.generateAudioSummary;
		expect(computeCreditCost(options)).toBe(expected);
	});

	it("Property 1: Credit cost computation is additive over options", () => {
		fc.assert(
			fc.property(
				processingOptionsArb,
				processingOptionsArb,
				(optionsA, optionsB) => {
					const combined: ProcessingOptions = {
						transcribe: optionsA.transcribe || optionsB.transcribe,
						summarize: optionsA.summarize || optionsB.summarize,
						extractKeywords:
							optionsA.extractKeywords || optionsB.extractKeywords,
						extractMainIdeas:
							optionsA.extractMainIdeas || optionsB.extractMainIdeas,
						generateNotes: optionsA.generateNotes || optionsB.generateNotes,
						generateAudioSummary:
							optionsA.generateAudioSummary || optionsB.generateAudioSummary,
					};

					const costA = computeCreditCost(optionsA);
					const costB = computeCreditCost(optionsB);
					const costCombined = computeCreditCost(combined);

					expect(costA).toBeGreaterThanOrEqual(0);
					expect(costB).toBeGreaterThanOrEqual(0);
					expect(costCombined).toBeGreaterThanOrEqual(Math.max(costA, costB));
					expect(costCombined).toBeLessThanOrEqual(costA + costB);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("Property 1 (single): cost equals sum of enabled option costs", () => {
		fc.assert(
			fc.property(processingOptionsArb, (options) => {
				const expected = (
					Object.keys(CREDIT_COSTS) as Array<keyof typeof CREDIT_COSTS>
				).reduce(
					(sum, key) => (options[key] ? sum + CREDIT_COSTS[key] : sum),
					0,
				);

				expect(computeCreditCost(options)).toBe(expected);
			}),
			{ numRuns: 100 },
		);
	});
});
