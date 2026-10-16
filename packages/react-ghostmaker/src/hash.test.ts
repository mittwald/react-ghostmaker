import { expect, test } from "vitest";
import { hashObject } from "./hash.ts";

test("returns equal hashes for objects with equal content", () => {
  expect(hashObject({ a: 1, b: [1, 2] })).toBe(hashObject({ a: 1, b: [1, 2] }));
});

test("returns different hashes for objects with different content", () => {
  expect(hashObject({ a: 1 })).not.toBe(hashObject({ a: 2 }));
});

test("caches the hash per object instance", () => {
  const obj = { a: 1 };
  const initialHash = hashObject(obj);

  obj.a = 2;

  expect(hashObject(obj)).toBe(initialHash);
  expect(hashObject({ a: 2 })).not.toBe(initialHash);
});
