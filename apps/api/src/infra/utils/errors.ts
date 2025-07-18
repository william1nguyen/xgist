import {format} from 'node:util';
import type {AnyRecord} from './types';

export type XgistErrorContext = AnyRecord;

export interface XgistErrorOptions {
  cause?: Error;
  context?: XgistErrorContext;
}

export interface XgistErrorInstance extends Error {
  code: string;
  statusCode?: number;
  cause?: Error;
  context?: XgistErrorContext;
}

export type XgistErrorConstructor = new (
  message?: string,
  options?: XgistErrorOptions
) => XgistErrorInstance;

function _toString(this: XgistErrorInstance) {
  return `${this.name} [${this.code}]: ${this.message}`;
}

export const createError = (
  code: string,
  message: string,
  statusCode = 500,
  Base = Error
): XgistErrorConstructor => {
  if (!code) throw new Error('Error code must not be empty');
  if (!message) throw new Error('Error message must not be empty');

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  function XgistError(this: XgistErrorInstance, ...args: any[]) {
    if (!new.target) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return new (XgistError as any)(message, ...args);
    }

    this.code = code;
    this.name = 'XgistError';
    this.statusCode = statusCode;

    const lastElement = args.length - 1;
    if (
      lastElement !== -1 &&
      args[lastElement] &&
      typeof args[lastElement] === 'object'
    ) {
      const opts = args.pop() as XgistErrorOptions;
      if ('cause' in opts) {
        this.cause = opts.cause;
      }
      if ('context' in opts) {
        this.context = opts.context;
      }
    }

    this.message = format(message, ...args);

    Error.stackTraceLimit !== 0 && Error.captureStackTrace(this, XgistError);
  }

  XgistError.prototype = Object.create(Base.prototype, {
    constructor: {
      value: XgistError,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });

  XgistError.prototype[Symbol.toStringTag] = 'Error';

  XgistError.prototype.toString = _toString;

  return XgistError as unknown as XgistErrorConstructor;
};

export enum XgistErrorCode {}
