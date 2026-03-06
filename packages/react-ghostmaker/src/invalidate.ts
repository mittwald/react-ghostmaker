import { type QueryClient } from "@tanstack/react-query";
import type { QueryKey } from "./types.ts";

export async function invalidateGhosts(
  queryClient: QueryClient,
  queryKey: QueryKey,
) {
  for (let i = 1; i <= queryKey.length; i++) {
    const partialKey = queryKey.slice(0, i);
    const exact = i < queryKey.length;

    await queryClient.invalidateQueries({
      queryKey: partialKey,
      exact,
    });
  }
}
