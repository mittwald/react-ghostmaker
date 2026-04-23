import type { QueryFilters, QueryKey } from "@tanstack/react-query";

export const withEachGhost = async (
  queryKey: QueryKey,
  callback: (queryFilters: QueryFilters) => Promise<void>,
) => {
  for (let i = 1; i <= queryKey.length; i++) {
    const partialKey = queryKey.slice(0, i);
    const exact = i < queryKey.length;

    await callback({
      queryKey: partialKey,
      exact,
    });
  }
};
