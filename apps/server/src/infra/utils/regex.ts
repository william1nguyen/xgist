import {isArr} from './types';

export const matchAnyRegex = (
  str: string,
  rules: RegExp | RegExp[]
): boolean => {
  if (isArr(rules)) {
    return rules.some((rule) => Boolean(rule.exec(str)));
  }
  return Boolean(rules.exec(str));
};

export const matchAllRegex = (
  str: string,
  rules: RegExp | RegExp[]
): boolean => {
  if (isArr(rules)) {
    return rules.every((rule) => Boolean(rule.exec(str)));
  }
  return Boolean(rules.exec(str));
};
