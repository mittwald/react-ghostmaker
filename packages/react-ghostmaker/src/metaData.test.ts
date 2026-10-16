import {
  getMetaData,
  getModelId,
  getModelName,
  GhostMakerModel,
  ghostMakerModel,
} from "./metaData.ts";
import type * as MetaDataModule from "./metaData.ts";
import { afterEach, describe, expect, test, vitest } from "vitest";

@GhostMakerModel({
  name: "TheGrandParent",
  getId: (grandParent) => grandParent.id,
})
class GrandParent {
  public readonly id: string;

  public constructor(id: string) {
    this.id = id;
  }
}

@GhostMakerModel({
  name: "TheParent",
})
class Parent extends GrandParent {}

@GhostMakerModel({
  name: "TheChild",
})
class Child extends Parent {}

@GhostMakerModel({
  name: "OnlyName",
})
class OnlyName {}

@GhostMakerModel({
  name: "OverridingId",
  getId: (model) => `overridden-${model.id}`,
})
class OverridingId extends GrandParent {}

class Undecorated {}

class UndecoratedChild extends Parent {}

afterEach(() => {
  vitest.restoreAllMocks();
});

test("getMetaData returns correct names", () => {
  expect(getMetaData(new Child("id"))?.name).toBe("TheChild");
  expect(getMetaData(new Parent("id"))?.name).toBe("TheParent");
  expect(getMetaData(Parent)?.name).toBe("TheParent");
  expect(getMetaData(Child)?.name).toBe("TheChild");
});

test("getMetaData returns getId function", () => {
  expect(getMetaData(new Child("id"))?.getId).toBeDefined();
  expect(getMetaData(new Parent("id"))?.getId).toBeDefined();
  expect(getMetaData(Parent)?.getId).toBeDefined();
  expect(getMetaData(Child)?.getId).toBeDefined();
});

describe("getModelName()", () => {
  test("returns the name of a decorated model", () => {
    expect(getModelName(new GrandParent("id"))).toBe("TheGrandParent");
    expect(getModelName(GrandParent)).toBe("TheGrandParent");
  });

  test("returns the name of a model without getId", () => {
    expect(getModelName(new OnlyName())).toBe("OnlyName");
  });

  test("returns the nearest name of an undecorated subclass", () => {
    expect(getModelName(new UndecoratedChild("id"))).toBe("TheParent");
  });

  test("returns undefined for undecorated values", () => {
    expect(getModelName(new Undecorated())).toBeUndefined();
    expect(getModelName(Undecorated)).toBeUndefined();
    expect(getModelName({})).toBeUndefined();
    expect(getModelName("string")).toBeUndefined();
    expect(getModelName(42)).toBeUndefined();
    expect(getModelName(null)).toBeUndefined();
    expect(getModelName(undefined)).toBeUndefined();
  });
});

describe("getModelId()", () => {
  test("returns the id of a decorated model", () => {
    expect(getModelId(new GrandParent("gp"))).toBe("gp");
  });

  test("uses getId inherited from a parent class", () => {
    expect(getModelId(new Child("child"))).toBe("child");
    expect(getModelId(new UndecoratedChild("undecorated"))).toBe("undecorated");
  });

  test("prefers getId of the subclass over the parent class", () => {
    expect(getModelId(new OverridingId("id"))).toBe("overridden-id");
  });

  test("returns undefined for models without getId", () => {
    expect(getModelId(new OnlyName())).toBeUndefined();
  });

  test("returns undefined for undecorated values", () => {
    expect(getModelId(new Undecorated())).toBeUndefined();
    expect(getModelId({ id: "id" })).toBeUndefined();
    expect(getModelId("string")).toBeUndefined();
    expect(getModelId(undefined)).toBeUndefined();
  });
});

describe("ghostMakerModel() (dynamic models)", () => {
  interface DynamicThing {
    kind: "dynamic-thing";
    key: string;
  }

  const isDynamicThing = (something: unknown): something is DynamicThing =>
    typeof something === "object" &&
    something !== null &&
    "kind" in something &&
    something.kind === "dynamic-thing";

  ghostMakerModel((something) => {
    if (isDynamicThing(something)) {
      return {
        name: "DynamicThing",
        getId: (thing) => (thing as unknown as DynamicThing).key,
      };
    }
  });

  ghostMakerModel((something) => {
    if (something instanceof GrandParent) {
      return { name: "NeverUsedForDecoratedModels" };
    }
  });

  test("provides meta data for plain objects", () => {
    const thing: DynamicThing = { kind: "dynamic-thing", key: "k1" };

    expect(getModelName(thing)).toBe("DynamicThing");
    expect(getModelId(thing)).toBe("k1");
  });

  test("is not used when the value does not match", () => {
    expect(getModelName({ kind: "other" })).toBeUndefined();
  });

  test("decorator meta data takes precedence over dynamic models", () => {
    expect(getModelName(new GrandParent("id"))).toBe("TheGrandParent");
  });
});

describe("name conflicts", () => {
  test("warns in development when a name is registered twice", () => {
    const warn = vitest.spyOn(console, "warn").mockImplementation(() => {
      // silence
    });

    @GhostMakerModel({ name: "Conflicting" })
    class First {}

    expect(warn).not.toHaveBeenCalled();

    @GhostMakerModel({ name: "Conflicting" })
    class Second {}

    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('"Conflicting" is already registered'),
    );
    expect(getModelName(new First())).toBe("Conflicting");
    expect(getModelName(new Second())).toBe("Conflicting");
  });

  test("throws in production when a name is registered twice", async () => {
    vitest.stubEnv("NODE_ENV", "production");
    vitest.resetModules();

    try {
      const { GhostMakerModel: ProdGhostMakerModel } =
        await vitest.importActual<typeof MetaDataModule>("./metaData.ts");

      const decorate = ProdGhostMakerModel({ name: "ProdConflicting" });
      decorate(class First {});

      expect(() => decorate(class Second {})).toThrow(
        '"ProdConflicting" is already registered',
      );
    } finally {
      vitest.unstubAllEnvs();
    }
  });
});
