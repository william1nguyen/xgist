import type {FastifyRequest} from 'fastify';

export interface SecurityHandlerOptions {
  shouldHandle: (req: FastifyRequest) => Promise<boolean>;
  onHandle: (req: FastifyRequest) => Promise<void>;
}