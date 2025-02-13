import { Type } from "@sinclair/typebox";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyFn = (...args: any) => any;

export type AnyRecord<T extends string | number | symbol = string> = Record<
  T,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  any
>;

/** Assertions */
export const isFunc = (x: unknown): x is AnyFn => typeof x === "function";
export const isString = (x: unknown): x is string => typeof x === "string";
export const isNum = (x: unknown): x is number => typeof x === "number";
export const isBool = (x: unknown): x is boolean => typeof x === "boolean";
export const isUndef = (x: unknown): x is undefined => typeof x === "undefined";
export const isSym = (x: unknown): x is symbol => typeof x === "symbol";
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const isArr = <T = any>(x: unknown): x is T[] => Array.isArray(x);

export const createIsArrOf =
  <T>(check: (member: unknown) => boolean) =>
  (x: unknown): x is T[] => {
    if (!isArr(x)) return false;

    return x.every(check);
  };

export const isArrOfString = createIsArrOf<string>(isString);
export const isArrOfNum = createIsArrOf<number>(isNum);
export const isArrOfBool = createIsArrOf<boolean>(isBool);

export type TimeZone = string;
