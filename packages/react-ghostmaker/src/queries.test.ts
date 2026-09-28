import { describe, expect, test } from "vitest";
import { queries } from "./queries.ts";
import { GhostMakerModel } from "./metaData.ts";
import { registerModelIdentifier } from "./modelIdentifier.ts";

@GhostMakerModel({
  name: "QueryModel",
  getId: (model) => model.id,
})
class QueryModel {
  public readonly id: string;

  public constructor(id: string) {
    this.id = id;
  }
}

@GhostMakerModel({
  name: "NamedOnly",
})
class NamedOnly {}

class PlainClass {}

class LegacyModel {
  public readonly legacyId: string;

  public constructor(legacyId: string) {
    this.legacyId = legacyId;
  }
}

registerModelIdentifier((model) =>
  model instanceof LegacyModel ? `legacy-${model.legacyId}` : undefined,
);

registerModelIdentifier((model) =>
  model instanceof LegacyModel ? "second" : undefined,
);

describe("queries.ghostmaker()", () => {
  test("returns the root query key", () => {
    expect(queries.ghostmaker()).toEqual(["react-ghostmaker"]);
  });
});

describe("queries.target()", () => {
  test.each([
    ["string", "string"],
    [42, "42"],
    [true, "true"],
    [null, "null"],
    [undefined, "undefined"],
  ])("uses primitive %s as is", (target, expected) => {
    expect(queries.target(target)).toEqual(["react-ghostmaker", expected]);
  });

  test("uses model name and id of decorated models", () => {
    expect(queries.target(new QueryModel("m1"))).toEqual([
      "react-ghostmaker",
      "QueryModel@m1",
    ]);
  });

  test("uses model name of decorated model classes", () => {
    expect(queries.target(QueryModel)).toEqual([
      "react-ghostmaker",
      "QueryModel",
    ]);
  });

  test("uses model name of decorated models without id", () => {
    expect(queries.target(new NamedOnly())).toEqual([
      "react-ghostmaker",
      "NamedOnly",
    ]);
  });

  test("uses class name of undecorated classes and instances", () => {
    expect(queries.target(PlainClass)).toEqual([
      "react-ghostmaker",
      "PlainClass",
    ]);
    expect(queries.target(new PlainClass())).toEqual([
      "react-ghostmaker",
      "PlainClass",
    ]);
  });

  test("uses function name of functions", () => {
    function someFunction() {
      // noop
    }
    expect(queries.target(someFunction)).toEqual([
      "react-ghostmaker",
      "someFunction",
    ]);
  });

  test("uses Object for plain objects", () => {
    expect(queries.target({ a: 1 })).toEqual(["react-ghostmaker", "Object"]);
  });

  test("uses all matching registered model identifiers", () => {
    expect(queries.target(new LegacyModel("l1"))).toEqual([
      "react-ghostmaker",
      "LegacyModel@legacy-l1.second",
    ]);
  });
});

describe("queries.chainItem()", () => {
  const prev = ["react-ghostmaker", "Target"];

  test("appends the property name for property access", () => {
    expect(queries.chainItem(prev, { propName: "name" })).toEqual([
      ...prev,
      "name",
    ]);
  });

  test("appends only the property name for calls without args", () => {
    expect(queries.chainItem(prev, { propName: "getAll", args: [] })).toEqual([
      ...prev,
      "getAll",
    ]);
  });

  test("appends primitive args as strings", () => {
    expect(
      queries.chainItem(prev, {
        propName: "find",
        args: ["id", 1, false, null, undefined],
      }),
    ).toEqual([...prev, "find", "id", "1", "false", "null", "undefined"]);
  });

  test("appends object args as name and hash", () => {
    const [key] = queries
      .chainItem(prev, { propName: "find", args: [{ filter: "a" }] })
      .slice(-1);

    expect(key).toMatch(/^Object\(hash:-?\d+\)$/);
  });

  test("uses the model name for model args", () => {
    const [key] = queries
      .chainItem(prev, { propName: "find", args: [new QueryModel("m1")] })
      .slice(-1);

    expect(key).toMatch(/^QueryModel\(hash:-?\d+\)$/);
  });

  test("object args with equal content produce equal keys", () => {
    const keyA = queries.chainItem(prev, {
      propName: "find",
      args: [{ filter: "a", page: 1 }],
    });
    const keyB = queries.chainItem(prev, {
      propName: "find",
      args: [{ filter: "a", page: 1 }],
    });

    expect(keyA).toEqual(keyB);
  });

  test("object args with different content produce different keys", () => {
    const keyA = queries.chainItem(prev, {
      propName: "find",
      args: [{ filter: "a" }],
    });
    const keyB = queries.chainItem(prev, {
      propName: "find",
      args: [{ filter: "b" }],
    });

    expect(keyA).not.toEqual(keyB);
  });
});

describe("queries.ghostChain()", () => {
  test("returns the target key for an empty chain", () => {
    expect(queries.ghostChain(QueryModel, [])).toEqual(
      queries.target(QueryModel),
    );
  });

  test("builds the key of the whole chain", () => {
    expect(
      queries.ghostChain(QueryModel, [
        { propName: "ofId", args: ["m1"] },
        { propName: "getDetailed", args: [] },
        { propName: "customer" },
        { propName: "getName", args: [] },
      ]),
    ).toEqual([
      "react-ghostmaker",
      "QueryModel",
      "ofId",
      "m1",
      "getDetailed",
      "customer",
      "getName",
    ]);
  });
});
