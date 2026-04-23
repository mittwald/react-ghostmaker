import { type QueryClient, type UseQueryOptions } from "@tanstack/react-query";
import is from "@sindresorhus/is";
import type { DependencyList, ReactNode } from "react";
import type { Class, UnknownRecord } from "type-fest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExplicitAny = any;
export type OrOptional<T> = T extends undefined ? undefined : never;
export type AnyFunction = (...args: ExplicitAny[]) => ExplicitAny;

export interface UseQueryReturnType<T> {
  result: T;
}

export type UseGhostOptions<T = unknown> = Omit<
  UseQueryOptions<UseQueryReturnType<T>>,
  "queryKey" | "queryFn"
>;

/** @deprecated Use `UseGhostOptions<unknown>` instead. */
export type useGhostOptions = UseGhostOptions<unknown>;

export interface ReactGhostMethods<T> extends Promise<T> {
  useGhost: (options?: UseGhostOptions<T>) => UseGhostReturn<T>;
  use: (options?: UseGhostOptions<T>) => T;
  render: (transform?: (item: T) => ReactNode) => ReactNode;
  transform: <U, U2 = U>(
    fn: (item: T extends ReactGhost<infer T2> ? T2 : T) => U2,
    dependencies?: DependencyList,
  ) => ReactGhost<U2>;
  invalidate: (queryClient: QueryClient) => Promise<void>;
  reset: (queryClient: QueryClient) => Promise<void>;
}

export const transformFnProp = "___transformFn" as const;
export const isGhostMarker = "___ghostMarker" as const;

export type ReactGhost<T> = ReactGhostMethods<T> & {
  [K in keyof NonNullable<T>]-?: NonNullable<T>[K] extends AnyFunction
    ? <TParams extends Parameters<NonNullable<T>[K]>>(
        ...args: TParams
      ) => ReactGhost<Awaited<ReturnType<NonNullable<T>[K]>> | OrOptional<T>>
    : ReactGhost<NonNullable<T>[K] | OrOptional<T>>;
};

export interface GhostChainItem {
  propName: string | typeof transformFnProp;
  args?: ExplicitAny[];
}

export type GhostChain = GhostChainItem[];

export type GhostChainTargetType =
  | UnknownRecord
  | Class<unknown>
  | null
  | undefined;

export type QueryKey = readonly unknown[];

export type InvalidateGhostFn = () => Promise<void>;
export type ResetGhostFn = () => Promise<void>;

export interface GhostChainContext {
  queryKey: QueryKey;
}

export interface UseGhostReturn<T> {
  value: T;
  invalidate: InvalidateGhostFn;
  reset: ResetGhostFn;
}

export function isReactGhost<T>(
  something: unknown,
): something is ReactGhost<T> {
  return (
    is.function(something) &&
    something[isGhostMarker as keyof typeof something] === true
  );
}

export type ModelIdentifier = (model: unknown) => string | undefined;
