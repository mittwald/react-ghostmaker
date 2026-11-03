import is, { assert } from "@sindresorhus/is";
import { useEffect, useRef } from "react";
import {
  transformFnProp,
  type GhostChain,
  type GhostChainItem,
  type QueryKey,
  type UseGhostOptions,
  type UseGhostReturn,
  type UseQueryReturnType,
} from "./types.ts";
import {
  useQueryClient,
  useSuspenseQueries,
  type QueryClient,
  type UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import { queries } from "./queries.ts";
import { ghostFnContext } from "./context.ts";
import { invalidateGhosts } from "./invalidate.ts";
import { hashObject } from "./hash.ts";
import { resetGhosts } from "./reset.ts";

type ChainQueryOptions = UseSuspenseQueryOptions<UseQueryReturnType<unknown>>;

type GetChainQueryResult = (
  queryOptions: ChainQueryOptions,
  index: number,
) => UseQueryReturnType<unknown> | undefined;

interface ChainCall {
  queryKey: QueryKey;
  target: object;
}

interface TransformMemo {
  dependencies: unknown[];
  value: unknown;
}

type TransformMemos = Map<number, TransformMemo>;

/**
 * Resolves a ghost chain with a fixed set of hooks, regardless of the chain and
 * its target. All queries of the chain go through a single
 * `useSuspenseQueries()`, so React sees the same hooks when the target is
 * empty, an intermediate result is undefined or a different ghost is passed.
 */
export const useGhostChain = <T>(
  target: unknown,
  chain: GhostChain,
  options: UseGhostOptions<T> = {},
): UseGhostReturn<T> => {
  const queryClient = useQueryClient();
  const transformMemos = useRef<TransformMemos>(new Map());

  const walk = (getResult: GetChainQueryResult) =>
    walkGhostChain(
      target,
      chain,
      options as UseGhostOptions,
      transformMemos.current,
      getResult,
    );

  const { queryOptions } = walk((queryOptions) =>
    getCachedQueryResult(queryClient, queryOptions),
  );
  const results = useSuspenseQueries({ queries: queryOptions });

  const failedQuery = results.find((result) => result.error);
  if (failedQuery) {
    throw failedQuery.error;
  }

  const { value, calls } = walk((ignored, index) => results[index]?.data);

  useTargetAutoInvalidate(calls);

  const invalidate = () =>
    invalidateGhosts(queryClient, queries.ghostChain(target, chain));

  const reset = () =>
    resetGhosts(queryClient, queries.ghostChain(target, chain));

  return {
    value: value as T,
    invalidate,
    reset,
  };
};

/**
 * Walks the chain as far as `getResult` provides results. Returns the queries
 * needed so far: up to and including the first one without a result.
 */
const walkGhostChain = (
  target: unknown,
  chain: GhostChain,
  options: UseGhostOptions,
  transformMemos: TransformMemos,
  getResult: GetChainQueryResult,
) => {
  const queryOptions: ChainQueryOptions[] = [];
  const calls: ChainCall[] = [];
  let queryKey: QueryKey = queries.target(target);
  let value = target;

  for (const [index, item] of chain.entries()) {
    const { propName, args } = item;

    if (propName === transformFnProp) {
      value = transform(value, item, transformMemos, index);
      continue;
    }

    if (is.nullOrUndefined(value)) {
      continue;
    }
    assert.object(value);

    const targetProperty = value[propName as keyof typeof value];
    queryKey = queries.chainItem(queryKey, item);

    if (args === undefined) {
      // no function call, just a property access
      value = targetProperty;
      continue;
    }

    assert.function(targetProperty);
    const targetFn = targetProperty.bind(value);

    const callOptions: ChainQueryOptions = {
      ...(options as Omit<ChainQueryOptions, "queryKey" | "queryFn">),
      queryKey,
      queryFn: async (ctx) => {
        const targetFnWithContext = ghostFnContext.bind(
          { query: ctx },
          targetFn,
        );
        return { result: await targetFnWithContext(...args) };
      },
    };

    calls.push({ queryKey, target: value });
    queryOptions.push(callOptions);

    const result = getResult(callOptions, queryOptions.length - 1);
    if (result === undefined) {
      return { queryOptions, calls, value: undefined };
    }
    value = result.result;
  }

  return { queryOptions, calls, value };
};

const getCachedQueryResult = (
  queryClient: QueryClient,
  queryOptions: ChainQueryOptions,
) => {
  const { queryHash } = queryClient.defaultQueryOptions(queryOptions);
  return queryClient.getQueryCache().get<UseQueryReturnType<unknown>>(queryHash)
    ?.state.data;
};

const transform = (
  target: unknown,
  item: GhostChainItem,
  transformMemos: TransformMemos,
  index: number,
) => {
  const { args } = item;
  assert.array(args);
  const transformFn = args[0];
  assert.function(transformFn, "transform requires a mapping function");

  const transformDependencies = args[1] ?? [];
  assert.array(transformDependencies);

  const dependencies = [target, ...transformDependencies];
  const memo = transformMemos.get(index);

  if (memo && areDependenciesEqual(memo.dependencies, dependencies)) {
    return memo.value;
  }

  const value = transformFn(target);
  transformMemos.set(index, { dependencies, value });
  return value;
};

const areDependenciesEqual = (a: unknown[], b: unknown[]) =>
  a.length === b.length &&
  a.every((dependency, i) => Object.is(dependency, b[i]));

const targetHashes = new Map<string, number>();

const useTargetAutoInvalidate = (calls: ChainCall[]) => {
  const queryClient = useQueryClient();
  const previousTargets = useRef(new Map<string, object>());

  useEffect(() => {
    const currentTargets = new Map<string, object>();

    for (const { queryKey, target } of calls) {
      const joinedQueryKey = queryKey.join(".");
      currentTargets.set(joinedQueryKey, target);

      if (previousTargets.current.get(joinedQueryKey) === target) {
        continue;
      }

      const targetHash = hashObject(target);
      const prevTargetHash = targetHashes.get(joinedQueryKey);

      const needsRefresh =
        prevTargetHash !== undefined && prevTargetHash !== targetHash;

      targetHashes.set(joinedQueryKey, targetHash);

      if (needsRefresh) {
        queryClient.invalidateQueries({
          queryKey,
        });
      }
    }

    previousTargets.current = currentTargets;
  });
};

/** @internal */
export const cleanupTargetHashes = () => {
  targetHashes.clear();
};
