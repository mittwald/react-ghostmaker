import { expect, test, vitest } from "vitest";
import { resolveGhostChain } from "./resolveGhostChain.ts";
import { transformFnProp } from "./types.ts";

class Counter {
  public readonly start: number;

  public constructor(start: number) {
    this.start = start;
  }

  public add(value: number) {
    return new Counter(this.start + value);
  }

  public async addAsync(value: number) {
    return this.add(value);
  }

  public async fail(): Promise<never> {
    throw new Error("failed");
  }

  public nothing(): Counter | undefined {
    return undefined;
  }
}

test("returns the target for an empty chain", async () => {
  const target = new Counter(1);
  expect(await resolveGhostChain(target, [])).toBe(target);
});

test("resolves property access", async () => {
  expect(await resolveGhostChain(new Counter(1), [{ propName: "start" }])).toBe(
    1,
  );
});

test("calls methods with args bound to their target", async () => {
  expect(
    await resolveGhostChain(new Counter(1), [
      { propName: "add", args: [2] },
      { propName: "addAsync", args: [3] },
      { propName: "start" },
    ]),
  ).toBe(6);
});

test("resolves to undefined after a nullish result", async () => {
  expect(
    await resolveGhostChain(new Counter(1), [
      { propName: "nothing", args: [] },
      { propName: "add", args: [1] },
      { propName: "start" },
    ]),
  ).toBeUndefined();
});

test("applies transform functions", async () => {
  const transform = vitest.fn((counter: Counter) => counter.start * 10);

  expect(
    await resolveGhostChain(new Counter(1), [
      { propName: "add", args: [1] },
      { propName: transformFnProp, args: [transform] },
    ]),
  ).toBe(20);
  expect(transform).toHaveBeenCalledOnce();
});

test("applies transform functions to nullish results", async () => {
  const transform = vitest.fn(() => "fallback");

  expect(
    await resolveGhostChain(new Counter(1), [
      { propName: "nothing", args: [] },
      { propName: transformFnProp, args: [transform] },
    ]),
  ).toBe("fallback");
  expect(transform).toHaveBeenCalledWith(undefined);
});

test("rejects when a transform has no mapping function", async () => {
  await expect(
    resolveGhostChain(new Counter(1), [
      { propName: transformFnProp, args: [] },
    ]),
  ).rejects.toThrow("transform requires a mapping function");
});

test("rejects when calling a property that is not a function", async () => {
  await expect(
    resolveGhostChain(new Counter(1), [{ propName: "start", args: [] }]),
  ).rejects.toThrow(TypeError);
});

test("rejects when accessing a property of a primitive", async () => {
  await expect(
    resolveGhostChain("string", [{ propName: "length" }]),
  ).rejects.toThrow(TypeError);
});

test("rejects when a method rejects", async () => {
  await expect(
    resolveGhostChain(new Counter(1), [{ propName: "fail", args: [] }]),
  ).rejects.toThrow("failed");
});
