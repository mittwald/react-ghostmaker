import { classes } from "polytype";
import { expect, test } from "vitest";
import { GhostMakerModel } from "./polytype.ts";
import { getModelId, getModelName } from "./metaData.ts";

@GhostMakerModel({
  name: "Named",
})
class Named {}

@GhostMakerModel({
  name: "Identified",
  getId: (model) => model.id,
})
class Identified {
  public readonly id: string;

  public constructor(id: string) {
    this.id = id;
  }
}

@GhostMakerModel({
  getId: (model) => `id-only-${model.id}`,
})
class IdOnly {
  public readonly id: string;

  public constructor(id: string) {
    this.id = id;
  }
}

@GhostMakerModel({
  name: "NamedBase",
})
class NamedBase {}

class NamedSub extends NamedBase {}

class MergedParents extends classes(Named, IdOnly) {
  public constructor(id: string) {
    super([], [id]);
  }
}

class ConflictingParents extends classes(Named, NamedSub, Identified) {
  public constructor(id: string) {
    super([], [], [id]);
  }
}

class DeepFirstParent extends classes(NamedSub, Named) {}

@GhostMakerModel({
  name: "Multi",
})
class Multi extends classes(Named, Identified) {
  public constructor(id: string) {
    super([], [id]);
  }
}

@GhostMakerModel({
  name: "MultiWithId",
  getId: (model) => `multi-${model.id}`,
})
class MultiWithId extends classes(Named, Identified) {
  public constructor(id: string) {
    super([], [id]);
  }
}

test("uses meta data of the class itself", () => {
  expect(getModelName(new MultiWithId("m1"))).toBe("MultiWithId");
  expect(getModelId(new MultiWithId("m1"))).toBe("multi-m1");
});

test("finds getId in any of multiple parent classes", () => {
  expect(getModelName(new Multi("m1"))).toBe("Multi");
  expect(getModelId(new Multi("m1"))).toBe("m1");
});

test("keeps working for models with complete meta data", () => {
  expect(getModelName(new Identified("i1"))).toBe("Identified");
  expect(getModelId(new Identified("i1"))).toBe("i1");
});

test("returns partial meta data of models without getId", () => {
  expect(getModelName(new Named())).toBe("Named");
  expect(getModelId(new Named())).toBeUndefined();
});

test("returns partial meta data of models without name", () => {
  expect(getModelName(new IdOnly("i1"))).toBeUndefined();
  expect(getModelId(new IdOnly("i1"))).toBe("id-only-i1");
});

test("inherits partial meta data from a single parent class", () => {
  expect(getModelName(new NamedSub())).toBe("NamedBase");
});

test("merges meta data of multiple parent classes", () => {
  expect(getModelName(new MergedParents("m1"))).toBe("Named");
  expect(getModelId(new MergedParents("m1"))).toBe("id-only-m1");
});

test("prefers meta data of earlier parent classes", () => {
  expect(getModelName(new ConflictingParents("c1"))).toBe("Named");
  expect(getModelId(new ConflictingParents("c1"))).toBe("c1");
});

test("searches ancestors of earlier parent classes first", () => {
  expect(getModelName(new DeepFirstParent())).toBe("NamedBase");
});
