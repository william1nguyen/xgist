import { add } from "lodash";
import { expect, test } from "vitest";

test("adds", () => {
  expect(add(1, 1)).toEqual(2);
});
