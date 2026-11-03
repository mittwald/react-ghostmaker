import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { afterEach, beforeEach, expect, test, vitest } from "vitest";
import { optionalGhost } from "./optionalGhost.ts";
import { ProjectGhost } from "./testMocks.ts";
import type { ReactGhost } from "./types.ts";
import { cleanupTargetHashes } from "./useGhostChain.ts";

const queryClient = new QueryClient();

beforeEach(() => {
  vitest.useFakeTimers();
  cleanupTargetHashes();
  queryClient.clear();
});

afterEach(() => {
  cleanup();
  vitest.runOnlyPendingTimers();
  vitest.useRealTimers();
});

type NameGhost = ReactGhost<string> | null | undefined;

const ProjectName = (props: { nameGhost: NameGhost }) => {
  useState();
  return <>{optionalGhost(props.nameGhost).use() ?? "no project"}</>;
};

const renderProjectName = (nameGhost: NameGhost) => {
  const element = (nameGhost: NameGhost) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="loading">
        <ProjectName nameGhost={nameGhost} />
      </Suspense>
    </QueryClientProvider>
  );

  const ui = render(element(nameGhost));

  return {
    ui,
    rerender: (nameGhost: NameGhost) => ui.rerender(element(nameGhost)),
  };
};

const settle = async () => {
  for (let i = 0; i < 3; i++) {
    await act(() => vitest.runOnlyPendingTimersAsync());
  }
};

test("resolves to undefined without suspending if the ghost is missing", () => {
  expect(renderProjectName(undefined).ui.container.textContent).toBe(
    "no project",
  );
  cleanup();
  expect(renderProjectName(null).ui.container.textContent).toBe("no project");
});

test("resolves the given ghost", async () => {
  const { ui } = renderProjectName(
    ProjectGhost.ofId("Project A").getDetailed().name,
  );
  expect(ui.container.textContent).toBe("loading");

  await settle();
  expect(ui.container.textContent).toBe("Project Project A");
});

test("keeps the hook order when the ghost is set or removed", async () => {
  const { ui, rerender } = renderProjectName(undefined);
  expect(ui.container.textContent).toBe("no project");

  rerender(ProjectGhost.ofId("Project A").getDetailed().name);
  await settle();
  expect(ui.container.textContent).toBe("Project Project A");

  rerender(undefined);
  expect(ui.container.textContent).toBe("no project");
});
