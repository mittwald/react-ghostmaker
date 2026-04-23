import { type QueryClient } from "@tanstack/react-query";
import type { QueryKey } from "./types.ts";
import { withEachGhost } from "./withEachGhost.ts";

export async function resetGhosts(
  queryClient: QueryClient,
  queryKey: QueryKey,
) {
  await withEachGhost(queryKey, async (filter) => {
    await queryClient.resetQueries(filter);
  });
}
