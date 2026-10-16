import { expect, test } from "vitest";
import { makeGhost } from "./makeGhost.ts";
import { isReactGhost } from "./types.ts";

test("isReactGhost() detects ghosts", () => {
  const ghost = makeGhost({ foo: () => "bar" });

  expect(isReactGhost(ghost)).toBe(true);
  expect(isReactGhost(ghost.foo)).toBe(true);
  expect(isReactGhost(ghost.foo())).toBe(true);
});

test.each([
  ["a function", () => true],
  ["an object", { ___ghostMarker: true }],
  ["a string", "ghost"],
  ["null", null],
  ["undefined", undefined],
])("isReactGhost() returns false for %s", (_, something) => {
  expect(isReactGhost(something)).toBe(false);
});
