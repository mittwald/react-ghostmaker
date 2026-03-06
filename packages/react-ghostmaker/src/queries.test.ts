import { getMetaData, GhostMakerModel } from "./metaData.ts";
import { expect, test } from "vitest";

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
