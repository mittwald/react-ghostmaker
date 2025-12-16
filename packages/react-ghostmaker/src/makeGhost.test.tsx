import { cleanup, render } from "@testing-library/react";
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
} from "./testMocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invalidateGhosts } from "./invalidate";
import { makeGhost } from "./makeGhost";
import { cleanupTargetHashes } from "./useGhostChain";

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
