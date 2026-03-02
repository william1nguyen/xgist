import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { billingRouter } from "./billing";
import { creditsRouter } from "./credits";
import { queueRouter } from "./queue";
import { videoRouter } from "./video";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	video: videoRouter,
	queue: queueRouter,
	credits: creditsRouter,
	billing: billingRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
