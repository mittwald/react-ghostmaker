import is, { assert } from "@sindresorhus/is";
import { useEffect, useEffectEvent, useMemo } from "react";
import {
  transformFnProp,
  type GhostChain,
  type GhostChainContext,
  type GhostChainItem,
  type QueryKey,
  type useGhostOptions,
  type UseGhostReturn,
  type UseQueryReturnType,
} from "./types";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { queries } from "./queries";
import { ghostFnContext } from "./context";
import { invalidateGhosts } from "./invalidate";
import { hashObject } from "./hash";

export const useGhostChain = <T>(
  target: unknown,
  chain: GhostChain,
  options?: useGhostOptions,
): UseGhostReturn<T> => {
  const queryClient = useQueryClient();

  const context: GhostChainContext = {
    queryKey: queries.target(target),
  };

  const value = chain.reduce(
    (currentTarget, item) =>
      useGhostChainItem(currentTarget, item, options, context),
    target as unknown,
  ) as T;

  const invalidate = () =>
    invalidateGhosts(queryClient, queries.ghostChain(target, chain));

  return {
    value,
    invalidate,
  };
};

const useGhostChainItem = <T>(
  target: unknown,
  item: GhostChainItem,
  options: useGhostOptions<T> = {},
  context: GhostChainContext,
): unknown => {
  const { propName, args } = item;

  if (propName === transformFnProp) {
    assert.array(args);
    const transformFn = args[0];
    assert.function(transformFn, "transform requires a mapping function");

    const transformDependencies = args[1] ?? [];
    assert.array(transformDependencies);
    return useMemo(
      () => transformFn(target),
      [target, ...transformDependencies],
    );
  }

  if (is.nullOrUndefined(target)) {
    return target;
  }
  assert.object(target);

  const targetPropertyName = propName as keyof typeof target;
  const targetProperty = target[targetPropertyName];
  context.queryKey = queries.chainItem(context.queryKey, item);

  if (args === undefined) {
    // no function call, just a property access
    return targetProperty;
  }

  assert.function(targetProperty);
  const targetFn = targetProperty.bind(target);

  const queryKey = [...context.queryKey];

  const query = useSuspenseQuery<UseQueryReturnType<T>>({
    ...options,

    queryKey,
    queryFn: async (ctx) => {
      const targetFnWithContext = ghostFnContext.bind({ query: ctx }, targetFn);
      return { result: await targetFnWithContext(...args) };
    },
  });

  useTargetAutoInvalidate(target, queryKey);

  if (query.error) {
    throw query.error;
  }

  return query.data.result;
};

const targetHashes = new Map<string, number>();

const useTargetAutoInvalidate = (target: object, queryKey: QueryKey) => {
  const queryClient = useQueryClient();

  const onTargetChangeEvent = useEffectEvent(() => {
    const joinedQueryKey = queryKey.join(".");
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
  });

  useEffect(() => {
    onTargetChangeEvent();
  }, [target]);
};

/** @internal */
export const cleanupTargetHashes = () => {
  targetHashes.clear();
};
