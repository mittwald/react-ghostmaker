import type { QueryFunctionContext } from "@tanstack/react-query";
import { expect, test } from "vitest";
import {
  forwardQueryContext,
  getQueryContext,
  ghostFnContext,
} from "./context.ts";

const queryContext = {
  queryKey: ["react-ghostmaker", "Target"],
} as unknown as QueryFunctionContext;

test("getQueryContext() returns undefined outside of a query", () => {
  expect(getQueryContext()).toBeUndefined();
});

test("getQueryContext() returns the context of the current query", () => {
  const result = ghostFnContext.run({ query: queryContext }, () =>
    getQueryContext(),
  );

  expect(result).toBe(queryContext);
});

test("forwardQueryContext() returns the result of the function", () => {
  expect(forwardQueryContext(() => "result")).toBe("result");
});

test("forwardQueryContext() provides the query context to the function", () => {
  const result = ghostFnContext.run({ query: queryContext }, () =>
    forwardQueryContext(() => getQueryContext()),
  );

  expect(result).toBe(queryContext);
});
