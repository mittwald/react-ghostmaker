import { QueryClient } from "@tanstack/react-query";
import { beforeEach, expect, test } from "vitest";
import { resetGhosts } from "./reset.ts";

const queryClient = new QueryClient();

const keys = {
  root: ["react-ghostmaker"],
  target: ["react-ghostmaker", "Target"],
  chain: ["react-ghostmaker", "Target", "getA"],
  dependent: ["react-ghostmaker", "Target", "getA", "getB"],
  sibling: ["react-ghostmaker", "Target", "getC"],
  other: ["react-ghostmaker", "Other"],
};

beforeEach(() => {
  queryClient.clear();
  for (const key of Object.values(keys)) {
    queryClient.setQueryData(key, "data");
  }
});

test("resets the ghost, its dependents and its ancestors", async () => {
  await resetGhosts(queryClient, keys.chain);

  expect(queryClient.getQueryData(keys.root)).toBeUndefined();
  expect(queryClient.getQueryData(keys.target)).toBeUndefined();
  expect(queryClient.getQueryData(keys.chain)).toBeUndefined();
  expect(queryClient.getQueryData(keys.dependent)).toBeUndefined();
});

test("does not reset siblings or other targets", async () => {
  await resetGhosts(queryClient, keys.chain);

  expect(queryClient.getQueryData(keys.sibling)).toBe("data");
  expect(queryClient.getQueryData(keys.other)).toBe("data");
});
