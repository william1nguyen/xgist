// NOTE: This code is adapted from `@fastify/error` package, with added ability to embed error context.
import {format} from 'node:util';
import type {AnyRecord} from './types';

export type TnaErrorContext = AnyRecord;

export interface TnaErrorOptions {
  cause?: Error;
  context?: TnaErrorContext;
}

export interface TnaErrorInstance extends Error {
  code: string;
  statusCode?: number;
  cause?: Error;
  context?: TnaErrorContext;
}

export type TnaErrorConstructor = new (
  message?: string,
  options?: TnaErrorOptions
) => TnaErrorInstance;

function _toString(this: TnaErrorInstance) {
  return `${this.name} [${this.code}]: ${this.message}`;
}

export const createError = (
  code: string,
  message: string,
  statusCode = 500,
  Base = Error
): TnaErrorConstructor => {
  if (!code) throw new Error('Error code must not be empty');
  if (!message) throw new Error('Error message must not be empty');

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  function TnaError(this: TnaErrorInstance, ...args: any[]) {
    if (!new.target) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return new (TnaError as any)(message, ...args);
    }

    this.code = code;
    this.name = 'TnaError';
    this.statusCode = statusCode;

    const lastElement = args.length - 1;
    if (
      lastElement !== -1 &&
      args[lastElement] &&
      typeof args[lastElement] === 'object'
    ) {
      const opts = args.pop() as TnaErrorOptions;
      if ('cause' in opts) {
        this.cause = opts.cause;
      }
      if ('context' in opts) {
        this.context = opts.context;
      }
    }

    this.message = format(message, ...args);

    Error.stackTraceLimit !== 0 && Error.captureStackTrace(this, TnaError);
  }

  TnaError.prototype = Object.create(Base.prototype, {
    constructor: {
      value: TnaError,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });

  TnaError.prototype[Symbol.toStringTag] = 'Error';

  TnaError.prototype.toString = _toString;

  return TnaError as unknown as TnaErrorConstructor;
};

export enum TnaErrorCode {}
