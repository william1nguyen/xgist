import {differenceInDays} from 'date-fns';
import {toZonedTime} from 'date-fns-tz';
import type {TimeZone} from './types';

export const noop = (): void => {
  /** noop */
};

export function createEnum<T extends string>(array: T[]): {[K in T]: K} {
  return array.reduce((acc, key) => {
    acc[key] = key;
    return acc;
  }, Object.create(null));
}

export const itemResponse = <T>(data: T): {data: T} => ({data});

export const trimAndNormalize = (value: string, isLower = false) => {
  const v = value.trim();

  return isLower
    ? v.replace(/\s+/g, ' ').toLowerCase()
    : v.replace(/\s+/g, ' ');
};

export const randomChoices = (chars: string, length: number): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Item = Record<string, any>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const groupBy = <T extends Item, R = any>(
  array: T[],
  key: keyof T,
  transformItem: (value: T) => R
): Map<T[keyof T], R[]> => {
  return array.reduce((map, obj) => {
    const keyValue = obj[key];
    if (!map.has(keyValue)) {
      map.set(keyValue, []);
    }

    const value = map.get(keyValue);
    if (value !== undefined) {
      value.push(transformItem(obj));
    }

    return map;
  }, new Map<T[keyof T], R[]>());
};

export const daysBetween = (
  start: Date,
  end: Date,
  timezone: TimeZone = 'UTC'
): number => {
  const startDate = toZonedTime(start, timezone);
  const endDate = toZonedTime(end, timezone);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return differenceInDays(endDate, startDate);
};

export const splitStr = (data: string, separator = ',', isTrim = true) => {
  if (isTrim) {
    return data.split(separator).map((item) => item.trim());
  }
  return data.split(separator);
};

export const isSubArray = (
  subArray: string[],
  mainArray: string[]
): boolean => {
  return subArray.every((item) => mainArray.includes(item));
};

export const maskContent = (
  value: string | null | undefined,
  options?: {unmaskedEndCharacters?: number; unmaskedStartCharacters?: number}
) => {
  if (!value) {
    return value;
  }

  const {unmaskedEndCharacters = 3, unmaskedStartCharacters = 3} =
    options || {};
  const length = value.length;
  const startStr = value.slice(0, unmaskedStartCharacters);
  const endStr =
    length > unmaskedEndCharacters + unmaskedStartCharacters
      ? value.slice(length - unmaskedEndCharacters, length)
      : '';

  const maskStr = Array.from({
    length: length - (startStr.length + endStr.length) + 1,
  }).join('*');

  return `${startStr}${maskStr}${endStr}`;
};
