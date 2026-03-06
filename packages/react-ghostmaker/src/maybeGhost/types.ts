import { type OrOptional, type ReactGhost } from "../types.ts";

export type MaybeReactGhost<T> =
  T extends ReactGhost<infer U> ? ReactGhost<U> | U : T | ReactGhost<T>;

export type PropsWithMaybeReactGhosts<T, TProps extends (keyof T)[]> = {
  [K in keyof T]: K extends TProps[number]
    ? MaybeReactGhost<T[K] | OrOptional<T[K]>>
    : T[K] | OrOptional<T[K]>;
};

type FixedUpReactGhost<T> =
  T extends MaybeReactGhost<infer U> ? ReactGhost<U> : T;

type WithGhostSuffix<T, TProps extends unknown[]> = T extends TProps[number]
  ? `${string & T}Ghost`
  : T;

export type PropsWithFixedUpReactGhosts<T, TProps extends (keyof T)[]> = {
  [K in keyof T as WithGhostSuffix<K, TProps>]: K extends TProps[number]
    ? FixedUpReactGhost<NonNullable<T[K]>>
    : T[K];
};
