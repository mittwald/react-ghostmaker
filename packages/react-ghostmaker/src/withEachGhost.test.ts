import { expect, test, vitest } from "vitest";
import { withEachGhost } from "./withEachGhost.ts";

test("calls the callback for each partial query key", async () => {
  const callback = vitest.fn(async () => {
    // noop
  });

  await withEachGhost(["a", "b", "c"], callback);

  expect(callback.mock.calls).toEqual([
    [{ queryKey: ["a"], exact: true }],
    [{ queryKey: ["a", "b"], exact: true }],
    [{ queryKey: ["a", "b", "c"], exact: false }],
  ]);
});

test("awaits each callback before calling the next one", async () => {
  const events: string[] = [];

  await withEachGhost(["a", "b"], async ({ queryKey }) => {
    events.push(`start ${queryKey?.join(".")}`);
    await Promise.resolve();
    events.push(`end ${queryKey?.join(".")}`);
  });

  expect(events).toEqual(["start a", "end a", "start a.b", "end a.b"]);
});

test("does not call the callback for an empty query key", async () => {
  const callback = vitest.fn(async () => {
    // noop
  });

  await withEachGhost([], callback);

  expect(callback).not.toHaveBeenCalled();
});
