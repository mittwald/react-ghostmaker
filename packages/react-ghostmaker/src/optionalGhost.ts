import { makeGhost } from "./makeGhost.ts";
import type { ReactGhost } from "./types.ts";

/**
 * Use instead of `ghost?.use()`: optional chaining skips the hook entirely when
 * the ghost is missing. The returned ghost always calls the same hooks and
 * resolves to `undefined` if no ghost is given.
 */
export function optionalGhost<T>(
  ghost: ReactGhost<T> | null | undefined,
): ReactGhost<T | undefined> {
  return (ghost ?? makeGhost(undefined)) as ReactGhost<T | undefined>;
}
