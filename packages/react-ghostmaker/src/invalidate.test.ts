import { QueryClient } from "@tanstack/react-query";
import { beforeEach, expect, test } from "vitest";
import { invalidateGhosts } from "./invalidate.ts";

const queryClient = new QueryClient();

const keys = {
  root: ["react-ghostmaker"],
  target: ["react-ghostmaker", "Target"],
  chain: ["react-ghostmaker", "Target", "getA"],
  dependent: ["react-ghostmaker", "Target", "getA", "getB"],
  sibling: ["react-ghostmaker", "Target", "getC"],
  other: ["react-ghostmaker", "Other"],
};

const isInvalidated = (key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

beforeEach(() => {
  queryClient.clear();
  for (const key of Object.values(keys)) {
    queryClient.setQueryData(key, "data");
  }
});

test("invalidates the ghost, its dependents and its ancestors", async () => {
  await invalidateGhosts(queryClient, keys.chain);

  expect(isInvalidated(keys.root)).toBe(true);
  expect(isInvalidated(keys.target)).toBe(true);
  expect(isInvalidated(keys.chain)).toBe(true);
  expect(isInvalidated(keys.dependent)).toBe(true);
});

test("does not invalidate siblings or other targets", async () => {
  await invalidateGhosts(queryClient, keys.chain);

  expect(isInvalidated(keys.sibling)).toBe(false);
  expect(isInvalidated(keys.other)).toBe(false);
});
