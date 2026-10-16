import { act, cleanup, render } from "@testing-library/react";
import { describe, expect, test, vitest, beforeEach, afterEach } from "vitest";
import {
  CustomerDetailed,
  CustomerGhost,
  Project,
  ProjectDetailed,
  ProjectGhost,
  advanceSleepTimer,
  customerMocks,
  getCustomerNameGhostIds,
  projectMocks,
} from "./testMocks.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invalidateGhosts } from "./invalidate.ts";
import { makeGhost } from "./makeGhost.ts";
import { cleanupTargetHashes } from "./useGhostChain.ts";
import { Component, Suspense, type ReactNode } from "react";

class FailingService {
  public async fail(): Promise<string> {
    throw new Error("Service failed");
  }
}

beforeEach(() => {
  vitest.useFakeTimers();
  cleanupTargetHashes();
});

afterEach(() => {
  vitest.runOnlyPendingTimers();
  vitest.useRealTimers();
});

test("Pre Test", async () => {
  const project = new Project("P1");
  expect(projectMocks.getDetailed).toHaveBeenCalledTimes(0);
  expect(customerMocks.getDetailed).toHaveBeenCalledTimes(0);

  const [detailedProject] = await Promise.all([
    project.getDetailed(),
    advanceSleepTimer(),
  ]);
  expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
  expect(customerMocks.getDetailed).toHaveBeenCalledTimes(0);
  expect(detailedProject.name).toBe("Project P1");

  const [customer] = await Promise.all([
    detailedProject.customer.getDetailed(),
    advanceSleepTimer(),
  ]);
  await vitest.runOnlyPendingTimersAsync();

  expect(customerMocks.getDetailed).toHaveBeenCalledTimes(1);
  expect(customer.id).toBe("C1");
});

describe("Await", () => {
  test("functions are called lazy", async () => {
    const transform = vitest.fn((name: string) => name);

    const customerNameGhost = ProjectGhost.ofId("Project A")
      .getDetailed()
      .customer.getDetailed()
      .getName()
      .transform(transform);

    expect(projectMocks.getDetailed).toHaveBeenCalledTimes(0);
    expect(customerMocks.getDetailed).toHaveBeenCalledTimes(0);
    expect(customerMocks.getName).toHaveBeenCalledTimes(0);
    expect(transform).toHaveBeenCalledTimes(0);

    await Promise.all([customerNameGhost, advanceSleepTimer(2)]);
    await vitest.runOnlyPendingTimersAsync();

    expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
    expect(customerMocks.getDetailed).toHaveBeenCalledTimes(1);
    expect(customerMocks.getName).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledTimes(1);
  });

  test("simple usage", async () => {
    const [customerName] = await Promise.all([
      ProjectGhost.ofId("Project A")
        .getDetailed()
        .customer.getDetailed()
        .getName(),
      advanceSleepTimer(2),
    ]);
    expect(customerName).toBe("Customer C1");
  });

  test("with transform", async () => {
    const [customerName] = await Promise.all([
      ProjectGhost.ofId("Project A")
        .getDetailed()
        .customer.getDetailed()
        .getName()
        .transform((name) => name.toUpperCase()),
      advanceSleepTimer(2),
    ]);
    expect(customerName).toBe("CUSTOMER C1");
  });

  test("with undefined result in call stack", async () => {
    const [customerName] = await Promise.all([
      ProjectGhost.ofId("Project A")
        .findDetailed()
        .customer.getDetailed()
        .getName()
        .transform((name) => {
          expect(name).toBeUndefined();
          return name?.toUpperCase();
        }),
      advanceSleepTimer(2),
    ]);
    expect(customerName).toBeUndefined();
  });
  test("rejects when a method rejects", async () => {
    await expect(makeGhost(new FailingService()).fail()).rejects.toThrow(
      "Service failed",
    );
  });

  test("resolves property access on the target", async () => {
    expect(await makeGhost({ name: "Plain" }).name).toBe("Plain");
  });

  test("converts to a string without resolving", () => {
    expect(String(ProjectGhost.ofId("Project A").getDetailed())).toBe(
      "ReactGhostmakerFunction",
    );
    expect(projectMocks.getDetailed).not.toHaveBeenCalled();
  });
});

describe("Hooks", () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    cleanup();
    queryClient.clear();
  });

  async function renderHookWithSuspense<T>(
    callback: () => T,
    options: { waitForSuspense?: boolean } = {},
  ) {
    const { waitForSuspense = true } = options;

    const result: { current: T | undefined } = {
      current: undefined,
    };

    const Component = () => {
      result.current = callback();
      return <span data-testid="hook-ready" />;
    };

    const ui = render(<Component />, {
      wrapper: (props) => (
        <QueryClientProvider client={queryClient}>
          {props.children}
        </QueryClientProvider>
      ),
    });

    if (waitForSuspense) {
      await Promise.all([
        ui.findByTestId("hook-ready"),
        vitest.runOnlyPendingTimersAsync(),
      ]);
    }

    return {
      ui,
      result,
      rerender: () => ui.rerender(<Component />),
    };
  }

  test("functions are called lazy", async () => {
    const transform = vitest.fn((name: string) => name);

    const customerNameGhost = ProjectGhost.ofId("Project A")
      .getDetailed()
      .customer.getDetailed()
      .getName()
      .transform(transform);

    expect(projectMocks.getDetailed).toHaveBeenCalledTimes(0);
    expect(customerMocks.getDetailed).toHaveBeenCalledTimes(0);
    expect(customerMocks.getName).toHaveBeenCalledTimes(0);
    expect(transform).toHaveBeenCalledTimes(0);

    await renderHookWithSuspense(() => customerNameGhost.useGhost());

    expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
    expect(customerMocks.getDetailed).toHaveBeenCalledTimes(1);
    expect(customerMocks.getName).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledTimes(1);
  });

  test("simple usage", async () => {
    const { result } = await renderHookWithSuspense(() =>
      ProjectGhost.ofId("Project A")
        .getDetailed()
        .customer.getDetailed()
        .getName()
        .use(),
    );

    expect(result.current).toBe("Customer C1");
    expect(customerMocks.getName).toHaveBeenCalledTimes(1);
  });

  test("simple usage with static function call", async () => {
    const { result } = await renderHookWithSuspense(() =>
      CustomerGhost.get("Customer A").use(),
    );

    expect(result.current).toBeInstanceOf(CustomerDetailed);
  });

  test("with transform", async () => {
    const { result } = await renderHookWithSuspense(() =>
      ProjectGhost.ofId("Project A")
        .getDetailed()
        .customer.getDetailed()
        .getName()
        .transform((name) => name.toUpperCase())
        .use(),
    );
    expect(result.current).toBe("CUSTOMER C1");
  });

  test("with undefined result in call stack", async () => {
    const transform = vitest.fn((name?: string) => name);

    const { result } = await renderHookWithSuspense(() =>
      ProjectGhost.ofId("Project A")
        .findDetailed()
        .customer.getDetailed()
        .getName()
        .transform(transform)
        .use(),
    );

    expect(result.current).toBeUndefined();
    expect(projectMocks.findDetailed).toHaveBeenCalledTimes(1);
    expect(customerMocks.getDetailed).toHaveBeenCalledTimes(0);
    expect(customerMocks.getName).toHaveBeenCalledTimes(0);
    expect(transform).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledWith(undefined);
  });

  test("generates query keys from the ghost chain", async () => {
    await renderHookWithSuspense(() =>
      ProjectGhost.ofId("Project A")
        .getDetailed()
        .customer.getDetailed()
        .getName()
        .use(),
    );

    const projectKey = ["react-ghostmaker", "Project", "ofId", "Project A"];
    const queryKeys = queryClient
      .getQueryCache()
      .findAll()
      .map((query) => query.queryKey);

    expect(queryKeys).toHaveLength(4);
    expect(queryKeys).toEqual(
      expect.arrayContaining([
        projectKey,
        [...projectKey, "getDetailed"],
        [...projectKey, "getDetailed", "customer", "getDetailed"],
        [...projectKey, "getDetailed", "customer", "getDetailed", "getName"],
      ]),
    );
  });

  test("passes query options to all queries of the chain", async () => {
    await renderHookWithSuspense(() =>
      ProjectGhost.ofId("Project A")
        .getDetailed()
        .getName()
        .use({ meta: { source: "test" } }),
    );

    const queries = queryClient.getQueryCache().findAll();

    expect(queries).toHaveLength(3);
    for (const query of queries) {
      expect(query.meta).toEqual({ source: "test" });
    }
  });

  test("re-runs transform only when its dependencies change", async () => {
    const transform = vitest.fn((name: string) => name);
    let dependency = 1;

    const { rerender } = await renderHookWithSuspense(() =>
      ProjectGhost.ofId("Project A")
        .getDetailed()
        .name.transform(transform, [dependency])
        .use(),
    );
    expect(transform).toHaveBeenCalledTimes(1);

    rerender();
    expect(transform).toHaveBeenCalledTimes(1);

    dependency = 2;
    rerender();
    expect(transform).toHaveBeenCalledTimes(2);
  });

  test("throws errors to the next error boundary", async () => {
    const consoleError = vitest
      .spyOn(console, "error")
      .mockImplementation(() => {
        // silence React error logging
      });

    class ErrorBoundary extends Component<
      { children: ReactNode },
      { error?: Error }
    > {
      public state: { error?: Error } = {};

      public static getDerivedStateFromError(error: Error) {
        return { error };
      }

      public render() {
        return this.state.error
          ? `Error: ${this.state.error.message}`
          : this.props.children;
      }
    }

    const FailingComponent = () => (
      <>{makeGhost(new FailingService()).fail().use({ retry: false })}</>
    );

    const ui = render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <FailingComponent />
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await Promise.all([
      ui.findByText("Error: Service failed"),
      vitest.runOnlyPendingTimersAsync(),
    ]);

    consoleError.mockRestore();
  });

  describe("Render", () => {
    async function renderWithSuspense(node: ReactNode) {
      const ui = render(
        <QueryClientProvider client={queryClient}>
          <Suspense fallback="loading">{node}</Suspense>
        </QueryClientProvider>,
      );
      expect(ui.container.textContent).toBe("loading");

      // each query of the chain starts its sleep timer after the previous one
      for (let i = 0; i < 3; i++) {
        await act(() => vitest.runOnlyPendingTimersAsync());
      }

      return ui;
    }

    test("ghost.render() renders the resolved value", async () => {
      const ui = await renderWithSuspense(
        ProjectGhost.ofId("Project A").getDetailed().name.render(),
      );

      expect(ui.container.textContent).toBe("Project Project A");
    });

    test("ghost.render() renders the transformed value", async () => {
      const ui = await renderWithSuspense(
        ProjectGhost.ofId("Project A")
          .getDetailed()
          .render((project) => <h1>{project.name.toUpperCase()}</h1>),
      );

      expect(ui.container.querySelector("h1")?.textContent).toBe(
        "PROJECT PROJECT A",
      );
    });

    test("ghost.render() is lazy", () => {
      ProjectGhost.ofId("Project A").getDetailed().name.render();
      expect(projectMocks.getDetailed).not.toHaveBeenCalled();
    });
  });

  describe("Reset", () => {
    test("useGhost.reset() triggers re-execution of all async methods", async () => {
      const { result } = await renderHookWithSuspense(() =>
        ProjectGhost.ofId("Project A")
          .getDetailed()
          .customer.getDetailed()
          .getName()
          .useGhost(),
      );
      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getName).toHaveBeenCalledTimes(1);

      result.current?.reset();
      await vitest.runOnlyPendingTimersAsync();

      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getName).toHaveBeenCalledTimes(2);
    });

    test("ghost.reset() removes cached data of the ghost chain", async () => {
      const ghost = ProjectGhost.ofId("Project A").getDetailed();
      const unrelatedGhost = CustomerGhost.ofId("Customer A");

      await renderHookWithSuspense(() => [ghost.use(), unrelatedGhost.use()]);

      const projectKey = ["react-ghostmaker", "Project", "ofId", "Project A"];
      const customerKey = [
        "react-ghostmaker",
        "Customer",
        "ofId",
        "Customer A",
      ];
      cleanup();

      await ghost.reset(queryClient);

      expect(queryClient.getQueryData(projectKey)).toBeUndefined();
      expect(
        queryClient.getQueryData([...projectKey, "getDetailed"]),
      ).toBeUndefined();
      expect(queryClient.getQueryData(customerKey)).toBeDefined();
    });
  });

  describe("Invalidation", () => {
    test("useGhost.invalidate() triggers re-execution of all async methods", async () => {
      const { result } = await renderHookWithSuspense(() =>
        ProjectGhost.ofId("Project A")
          .getDetailed()
          .customer.getDetailed()
          .getName()
          .useGhost(),
      );
      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getName).toHaveBeenCalledTimes(1);

      result.current?.invalidate();
      await vitest.runOnlyPendingTimersAsync();

      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getName).toHaveBeenCalledTimes(2);
    });

    test("ghost.invalidate() triggers re-execution of all async methods", async () => {
      const ghost = ProjectGhost.ofId("Project A")
        .getDetailed()
        .customer.getDetailed()
        .getName();

      await renderHookWithSuspense(() => ghost.use());
      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getName).toHaveBeenCalledTimes(1);

      ghost.invalidate(queryClient);
      await vitest.runOnlyPendingTimersAsync();

      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getName).toHaveBeenCalledTimes(2);
    });

    test("invalidateGhostsById() triggers re-execution of all async methods", async () => {
      const ghost = ProjectGhost.ofId("Project A")
        .getDetailed()
        .customer.getDetailed()
        .getName();

      await renderHookWithSuspense(() => ghost.use());
      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getName).toHaveBeenCalledTimes(1);

      invalidateGhosts(queryClient, getCustomerNameGhostIds.current!.queryKey);
      await vitest.runOnlyPendingTimersAsync();

      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getName).toHaveBeenCalledTimes(2);
    });

    test("ghost.invalidate() invalidates all dependent ghosts", async () => {
      const ghost = ProjectGhost.ofId("Project A").getDetailed();
      const specialGhost = ghost.customer.getDetailed();

      await renderHookWithSuspense(() => specialGhost.use());
      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(1);

      ghost.invalidate(queryClient);
      await vitest.runOnlyPendingTimersAsync();

      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(2);
    });

    test("ghost.invalidate() invalidates previous ghosts", async () => {
      const ghost = ProjectGhost.ofId("Project A").getDetailed();
      const specialGhost = ghost.customer.getDetailed();

      await renderHookWithSuspense(() => ghost.use());
      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(1);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(0);

      specialGhost.invalidate(queryClient);
      await vitest.runOnlyPendingTimersAsync();

      expect(projectMocks.getDetailed).toHaveBeenCalledTimes(2);
      expect(customerMocks.getDetailed).toHaveBeenCalledTimes(0);
    });

    test("target changes invalidates dependent ghosts", async () => {
      const projectGhost = ProjectGhost.ofId("Project A").getDetailed();

      await renderHookWithSuspense(() =>
        makeGhost(projectGhost.use()).getName().use(),
      );
      expect(projectMocks.getName).toHaveBeenCalledTimes(1);

      projectMocks.getDetailed = vitest
        .fn()
        .mockImplementation(
          (id) => new ProjectDetailed(id, `CHANGED! Project ${id}`, "C1"),
        );

      projectGhost.invalidate(queryClient);
      await vitest.runOnlyPendingTimersAsync();

      expect(projectMocks.getName).toHaveBeenCalledTimes(2);
    });
  });
});
