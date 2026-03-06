import is, { assert } from "@sindresorhus/is";
import {
  isReactGhost,
  transformFnProp,
  type AnyFunction,
  type GhostChain,
  type GhostChainItem,
} from "./types.ts";

const resolveGhostChainItem = async (target: unknown, item: GhostChainItem) => {
  const { propName, args } = item;

  if (propName === transformFnProp) {
    assert.array(args);
    const transformFn = args[0];
    assert.function(transformFn, "transform requires a mapping function");

    const transformed = transformFn(target);

    if (isReactGhost(transformed)) {
      return transformed;
    }

    return transformed;
  }

  if (is.nullOrUndefined(target)) {
    return undefined;
  }
  assert.object(target);
  const property = target[propName as keyof typeof target];

  if (args === undefined) {
    return property;
  }

  assert.function(property);

  const asyncFn = property.bind(target) as AnyFunction;

  return await asyncFn(...args);
};

export const resolveGhostChain = async (target: unknown, stack: GhostChain) => {
  let result = target;

  for (const item of stack) {
    result = await resolveGhostChainItem(result, item);
  }

  return result;
};
